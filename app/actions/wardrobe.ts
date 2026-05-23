"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { GoogleGenAI } from "@google/genai";
import { revalidatePath } from "next/cache";

const db = () => createAdminClient();

async function getUserId() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Session expired — please refresh");
  return user.id;
}

const gemini = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

const CLAUDIA_WARDROBE_SYSTEM = `You are Claudia — a personal AI and stylist. You adapt to context:
- When analyzing a clothing item: be precise and factual (category, color, description).
- When building an outfit: be confident, taste-forward, and direct. Speak like a friend with genuinely good style — not stiff, not over-the-top. Explain why pieces work together in 2-3 sentences max. Keep it cool.
You dress streetwear/chill-leaning but adapt to the occasion the user describes.`;

// ── UPLOAD (instant — no Gemini, just storage) ───────────────────────────────

export async function uploadWardrobeItemAction(formData: FormData) {
  try {
    const userId = await getUserId();
    const file = formData.get("file") as File | null;
    if (!file) return { error: "No file provided" };

    const bytes = await file.arrayBuffer();
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const path = `${userId}/items/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { error: uploadError } = await db().storage
      .from("wardrobe")
      .upload(path, new Uint8Array(bytes), { contentType: file.type, upsert: false });
    if (uploadError) return { error: uploadError.message };

    const { data: signed } = await db().storage.from("wardrobe").createSignedUrl(path, 3600);

    const { data, error } = await db()
      .from("wardrobe_items")
      .insert({ user_id: userId, storage_path: path, category: null, analyzed: false })
      .select("id")
      .single();
    if (error) return { error: error.message };

    return { id: data.id as string, url: signed?.signedUrl ?? "" };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Upload failed" };
  }
}

// ── ANALYZE SELECTED ITEMS (parallel Gemini Vision) ──────────────────────────

export async function analyzeWardrobeItemsAction(ids: string[]): Promise<{
  results: { id: string; category: string; color: string | null; description: string | null; brand: string | null }[];
  error?: never;
} | { error: string }> {
  try {
    const userId = await getUserId();

    const { data: items } = await db()
      .from("wardrobe_items")
      .select("id, storage_path")
      .in("id", ids)
      .eq("user_id", userId);

    if (!items?.length) return { error: "No items found" };

    const results = await Promise.all(
      items.map(async (item) => {
        const { data: fileData } = await db().storage.from("wardrobe").download(item.storage_path);
        if (!fileData) return null;

        const buf = await fileData.arrayBuffer();
        const base64 = Buffer.from(buf).toString("base64");

        const vision = await gemini.models.generateContent({
          model: "gemini-2.0-flash",
          contents: [{
            role: "user",
            parts: [
              { inlineData: { mimeType: "image/jpeg", data: base64 } },
              {
                text: `${CLAUDIA_WARDROBE_SYSTEM}\n\nAnalyze this clothing item and return ONLY valid JSON (no markdown):
{
  "category": "top|bottom|shoes|outerwear|headwear|accessory",
  "color": "primary color (e.g. 'navy blue', 'off-white')",
  "description": "brief description, max 15 words",
  "brand": "brand name if clearly visible, otherwise null"
}`,
              },
            ],
          }],
        });

        let meta = { category: "top", color: null as string | null, description: null as string | null, brand: null as string | null };
        try {
          const raw = vision.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
          meta = { ...meta, ...JSON.parse(raw.replace(/```json|```/g, "").trim()) };
        } catch { /* keep defaults */ }

        await db()
          .from("wardrobe_items")
          .update({ category: meta.category, color: meta.color, description: meta.description, brand: meta.brand, analyzed: true })
          .eq("id", item.id);

        return { id: item.id, ...meta };
      })
    );

    const valid = results.filter(Boolean) as { id: string; category: string; color: string | null; description: string | null; brand: string | null }[];
    revalidatePath("/wardrobe");
    return { results: valid };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Analysis failed" };
  }
}

export async function deleteWardrobeItemAction(id: string, storagePath: string) {
  try {
    const userId = await getUserId();
    await db().storage.from("wardrobe").remove([storagePath]);
    await db().from("wardrobe_items").delete().eq("id", id).eq("user_id", userId);
    revalidatePath("/wardrobe");
  } catch { /* non-critical */ }
}

// ── OUTFIT GENERATION ─────────────────────────────────────────────────────────

export async function generateOutfitAction(userPrompt: string): Promise<{
  caption: string;
  itemIds: string[];
  imageUrl: string;
  imagePath: string;
  error?: never;
} | { error: string }> {
  try {
    const userId = await getUserId();

    // Fetch all wardrobe items + their photos
    const { data: items } = await db()
      .from("wardrobe_items")
      .select("id, storage_path, category, color, description, brand")
      .eq("user_id", userId);

    if (!items?.length) return { error: "No clothes in your wardrobe yet — add some first." };

    // Download each item photo as base64 for Gemini
    const itemsWithImages = await Promise.all(
      items.map(async (item) => {
        const { data } = await db().storage.from("wardrobe").download(item.storage_path);
        if (!data) return null;
        const buf = await data.arrayBuffer();
        return { ...item, base64: Buffer.from(buf).toString("base64"), mimeType: "image/jpeg" };
      })
    );
    const valid = itemsWithImages.filter(Boolean) as NonNullable<typeof itemsWithImages[0]>[];

    // Build wardrobe context string
    const wardrobeContext = valid
      .map((i, idx) => `[${idx}] id:${i.id} category:${i.category} color:${i.color ?? "unknown"} — ${i.description ?? "no description"}${i.brand ? ` (${i.brand})` : ""}`)
      .join("\n");

    // Step 1 — Gemini picks the outfit + writes caption
    const selectionResult = await gemini.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [
        {
          role: "user",
          parts: [
            ...valid.map((i) => ({ inlineData: { mimeType: i.mimeType, data: i.base64 } })),
            {
              text: `${CLAUDIA_WARDROBE_SYSTEM}

Wardrobe inventory (index maps to the images above in order):
${wardrobeContext}

User request: "${userPrompt}"

Pick an outfit from the wardrobe above. Return ONLY valid JSON:
{
  "item_ids": ["uuid1", "uuid2", ...],
  "caption": "2-3 sentence stylist caption explaining why this fit works — confident, cool, direct"
}

Rules:
- Always include shoes if available
- Include outerwear or headwear only if it makes sense for the vibe
- Pick items that work together in color and style
- item_ids must be exact UUIDs from the inventory`,
            },
          ],
        },
      ],
    });

    let selectedIds: string[] = [];
    let caption = "";
    try {
      const raw = selectionResult.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
      const clean = raw.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      selectedIds = parsed.item_ids ?? [];
      caption = parsed.caption ?? "";
    } catch { return { error: "Claudia couldn't pick an outfit — try again." }; }

    const selectedItems = valid.filter((i) => selectedIds.includes(i.id));

    // Step 2 — Build flat-lay image generation prompt
    const categoryOrder = ["headwear", "top", "outerwear", "bottom", "shoes", "accessory"];
    const ordered = [...selectedItems].sort(
      (a, b) => categoryOrder.indexOf(a.category) - categoryOrder.indexOf(b.category)
    );
    const itemDescriptions = ordered
      .map((i) => `${i.category}: ${i.color ?? ""} ${i.description ?? ""}`.trim())
      .join("\n");

    const flatLayPrompt = `Fashion flat-lay photo, clean white background, overhead shot, studio lighting, soft even shadows, magazine quality. No people, no hangers, no mannequins.

Arrange clothing vertically from top to bottom with equal spacing between each item:
${itemDescriptions}

Each item should be fully visible, laid perfectly flat, centered on the white background. Ultra high resolution, minimal aesthetic.`;

    // Step 3 — Generate the flat-lay image
    const imageResult = await gemini.models.generateContent({
      model: "gemini-2.0-flash-preview-image-generation",
      contents: [{ role: "user", parts: [{ text: flatLayPrompt }] }],
      config: { responseModalities: ["IMAGE"] },
    });

    const imagePart = imageResult.candidates?.[0]?.content?.parts?.find(
      (p: { inlineData?: { data?: string; mimeType?: string } }) => p.inlineData?.data
    ) as { inlineData: { data: string; mimeType: string } } | undefined;

    if (!imagePart) return { error: "Claudia couldn't generate the fit image — try again." };

    // Upload generated image to Supabase Storage
    const imgBytes = Buffer.from(imagePart.inlineData.data, "base64");
    const imgPath = `${userId}/generated/${Date.now()}.png`;
    await db().storage
      .from("wardrobe")
      .upload(imgPath, imgBytes, { contentType: "image/png", upsert: false });

    const { data: imgSigned } = await db().storage.from("wardrobe").createSignedUrl(imgPath, 3600);

    return {
      caption,
      itemIds: selectedIds,
      imageUrl: imgSigned?.signedUrl ?? "",
      imagePath: imgPath,
    };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Generation failed" };
  }
}

// ── SAVED OUTFITS ─────────────────────────────────────────────────────────────

export async function saveOutfitAction(
  name: string,
  itemIds: string[],
  generatedImagePath: string,
  caption: string,
) {
  try {
    const userId = await getUserId();
    const { data, error } = await db()
      .from("saved_outfits")
      .insert({ user_id: userId, name, item_ids: itemIds, generated_image_path: generatedImagePath, caption })
      .select("id")
      .single();
    if (error) return { error: error.message };
    revalidatePath("/wardrobe");
    return { id: data.id as string };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to save outfit" };
  }
}

export async function markOutfitWornAction(id: string) {
  try {
    const userId = await getUserId();
    const { data: outfit } = await db()
      .from("saved_outfits")
      .select("worn_count")
      .eq("id", id)
      .eq("user_id", userId)
      .single();
    if (!outfit) return;
    await db()
      .from("saved_outfits")
      .update({ worn_count: (outfit.worn_count ?? 0) + 1, last_worn: new Date().toISOString().split("T")[0] })
      .eq("id", id);
    revalidatePath("/wardrobe");
  } catch { /* non-critical */ }
}

export async function deleteOutfitAction(id: string) {
  try {
    const userId = await getUserId();
    const { data } = await db().from("saved_outfits").select("generated_image_path").eq("id", id).eq("user_id", userId).single();
    if (data?.generated_image_path) {
      await db().storage.from("wardrobe").remove([data.generated_image_path]);
    }
    await db().from("saved_outfits").delete().eq("id", id).eq("user_id", userId);
    revalidatePath("/wardrobe");
  } catch { /* non-critical */ }
}

export async function refreshWardrobeUrlAction(storagePath: string): Promise<string> {
  const { data } = await db().storage.from("wardrobe").createSignedUrl(storagePath, 3600);
  return data?.signedUrl ?? "";
}
