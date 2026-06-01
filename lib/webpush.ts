/**
 * Web Push (aesgcm) via Node.js built-in WebCrypto — no external packages.
 * Works on Node 18/20/22/24+.
 */

const subtle = globalThis.crypto.subtle;

// Always returns a clean ArrayBuffer (never SharedArrayBuffer)
function toAB(u: Uint8Array): ArrayBuffer {
  const ab = new ArrayBuffer(u.length);
  new Uint8Array(ab).set(u);
  return ab;
}

function b64u(u: Uint8Array): string {
  return Buffer.from(u).toString("base64url");
}

function fromb64u(s: string): Uint8Array {
  const base64 = s.replace(/-/g, "+").replace(/_/g, "/");
  const buf = Buffer.from(base64, "base64");
  return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
}

function enc(s: string): Uint8Array { return new TextEncoder().encode(s); }

function concat(...arrays: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(arrays.reduce((n, a) => n + a.length, 0));
  let i = 0;
  for (const a of arrays) { out.set(a, i); i += a.length; }
  return out;
}

function uint16BE(n: number): Uint8Array {
  const b = new Uint8Array(2);
  new DataView(b.buffer).setUint16(0, n, false);
  return b;
}

async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, len: number): Promise<Uint8Array> {
  const key = await subtle.importKey("raw", toAB(ikm), "HKDF", false, ["deriveBits"]);
  const bits = await subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt: toAB(salt), info: toAB(info) },
    key,
    len * 8,
  );
  return new Uint8Array(bits);
}

async function vapidJwt(audience: string): Promise<string> {
  const rawPrivate = fromb64u(process.env.VAPID_PRIVATE_KEY!);

  // Wrap 32-byte raw EC P-256 key in PKCS#8 DER
  const pkcs8Header = Buffer.from(
    "3041020100301306072a8648ce3d020106082a8648ce3d030107042730250201010420",
    "hex",
  );
  const pkcs8 = Buffer.concat([pkcs8Header, Buffer.from(rawPrivate)]);

  const privateKey = await subtle.importKey(
    "pkcs8",
    pkcs8.buffer.slice(pkcs8.byteOffset, pkcs8.byteOffset + pkcs8.byteLength),
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );

  const now = Math.floor(Date.now() / 1000);
  const hdr  = Buffer.from(JSON.stringify({ typ: "JWT", alg: "ES256" })).toString("base64url");
  const body = Buffer.from(JSON.stringify({ aud: audience, exp: now + 43200, sub: `mailto:${process.env.VAPID_EMAIL}` })).toString("base64url");
  const unsigned = `${hdr}.${body}`;
  const sigBuf = await subtle.sign({ name: "ECDSA", hash: "SHA-256" }, privateKey, toAB(enc(unsigned)));
  return `${unsigned}.${b64u(new Uint8Array(sigBuf))}`;
}

async function encrypt(
  clientPub: string,
  clientAuth: string,
  plaintext: string,
): Promise<{ body: Uint8Array; salt: Uint8Array; serverPub: Uint8Array }> {
  const clientPubBytes  = fromb64u(clientPub);
  const authSecretBytes = fromb64u(clientAuth);
  const msg = enc(plaintext);

  const serverKP = await subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const serverPubRaw = new Uint8Array(await subtle.exportKey("raw", serverKP.publicKey));

  const clientKey = await subtle.importKey("raw", toAB(clientPubBytes), { name: "ECDH", namedCurve: "P-256" }, false, []);
  const sharedBits = await subtle.deriveBits({ name: "ECDH", public: clientKey }, serverKP.privateKey, 256);
  const shared = new Uint8Array(sharedBits);

  const salt = new Uint8Array(globalThis.crypto.getRandomValues(new Uint8Array(16)));

  // PRK = HKDF(authSecret, shared, "Content-Encoding: auth\0", 32)
  const prk = await hkdf(authSecretBytes, shared, enc("Content-Encoding: auth\0"), 32);

  // keying material info template
  const keyInfo = (label: string) => concat(
    enc(`Content-Encoding: ${label}\0`),
    enc("P-256\0"),
    uint16BE(clientPubBytes.length), clientPubBytes,
    uint16BE(serverPubRaw.length),   serverPubRaw,
  );

  const cekBytes = await hkdf(salt, prk, keyInfo("aesgcm"), 16);
  const nonce    = await hkdf(salt, prk, keyInfo("nonce"),   12);

  const aesKey = await subtle.importKey("raw", toAB(cekBytes), "AES-GCM", false, ["encrypt"]);
  const padded = concat(new Uint8Array(2), msg);
  const cipherBuf = await subtle.encrypt({ name: "AES-GCM", iv: toAB(nonce) }, aesKey, toAB(padded));

  return { body: new Uint8Array(cipherBuf), salt, serverPub: serverPubRaw };
}

export interface PushSubscription { endpoint: string; p256dh: string; auth: string }
export interface PushPayload { title: string; body: string; url?: string; tag?: string }

export async function sendWebPush(sub: PushSubscription, payload: PushPayload): Promise<number> {
  const url = new URL(sub.endpoint);
  const audience = `${url.protocol}//${url.host}`;
  const jwt = await vapidJwt(audience);
  const vapidPub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;

  const { body, salt, serverPub } = await encrypt(sub.p256dh, sub.auth, JSON.stringify(payload));

  const res = await fetch(sub.endpoint, {
    method: "POST",
    headers: {
      Authorization:    `vapid t=${jwt},k=${vapidPub}`,
      "Content-Type":   "application/octet-stream",
      "Content-Encoding": "aesgcm",
      Encryption:       `salt=${b64u(salt)}`,
      "Crypto-Key":     `dh=${b64u(serverPub)};p256ecdsa=${vapidPub}`,
      TTL:              "86400",
    },
    body: toAB(body),
  });
  return res.status;
}
