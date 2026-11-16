const { app, BrowserWindow, ipcMain, Menu, shell } = require("electron");
const log = require("electron-log/main");
const path = require("node:path");
const { getOAuthRedirectForOrigin, isAllowedGoogleOAuthUrl, parseOAuthCallback } = require("./oauth.cjs");

const NEXUS_URL = process.env.NEXUS_DESKTOP_URL || "https://nexus-kappa-henna.vercel.app";
const APP_ORIGIN = new URL(NEXUS_URL).origin;
const COURSEWELL_URL = process.env.COURSEWELL_DESKTOP_URL || "https://coursewell.vercel.app";
const COURSEWELL_ORIGIN = new URL(COURSEWELL_URL).origin;

let mainWindow;
let pendingNexusCallback;
let pendingCoursewellCallback;
const coursewellWindows = new Set();

function hasOrigin(rawUrl, origin) {
  try {
    return new URL(rawUrl).origin === origin;
  } catch {
    return false;
  }
}

function isTrustedOAuthUrl(rawUrl) {
  try {
    const url = new URL(rawUrl);
    if (url.protocol !== "https:") return false;
    return url.hostname === "accounts.google.com"
      || url.hostname.endsWith(".google.com")
      || url.hostname.endsWith(".supabase.co");
  } catch {
    return false;
  }
}

function deliverOAuthCallback(window, callbackUrl, onPending) {
  if (!window || window.isDestroyed()) {
    onPending(callbackUrl);
    return;
  }
  if (window.webContents.isLoading()) {
    window.webContents.once("did-finish-load", () => window.webContents.send("desktop:oauth-callback", callbackUrl));
    return;
  }
  window.webContents.send("desktop:oauth-callback", callbackUrl);
}

function handleAppLink(rawUrl) {
  const callback = parseOAuthCallback(rawUrl);
  if (!callback) return;
  if (callback.product === "nexus") {
    deliverOAuthCallback(mainWindow, rawUrl, (value) => { pendingNexusCallback = value; });
    return;
  }
  const window = [...coursewellWindows].find((candidate) => !candidate.isDestroyed());
  deliverOAuthCallback(window, rawUrl, (value) => { pendingCoursewellCallback = value; });
}

function openExternal(rawUrl) {
  try {
    const url = new URL(rawUrl);
    if (url.protocol === "https:" || url.protocol === "mailto:") {
      shell.openExternal(url.toString()).catch(() => {});
    }
  } catch {
    // Ignore malformed or unsupported URLs from remote content.
  }
}

function handleNavigation(event, rawUrl, origin) {
  if (hasOrigin(rawUrl, origin)) {
    return;
  }

  if (isTrustedOAuthUrl(rawUrl)) {
    return;
  }

  event.preventDefault();
  openExternal(rawUrl);
}

function attachWindowSecurity(window, origin) {
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (hasOrigin(url, COURSEWELL_ORIGIN)) {
      createProductWindow(COURSEWELL_URL, "Coursewell", COURSEWELL_ORIGIN);
      return { action: "deny" };
    }
    openExternal(url);
    return { action: "deny" };
  });
  window.webContents.on("will-navigate", (event, url) => handleNavigation(event, url, origin));
  window.webContents.on("will-redirect", (event, url) => handleNavigation(event, url, origin));
  window.webContents.on("did-fail-load", (_event, code, description, validatedURL, isMainFrame) => {
    if (isMainFrame) log.error("Product window failed to load", { code, description, validatedURL });
  });
  window.webContents.on("render-process-gone", (_event, details) => {
    log.error("Product renderer exited", details);
  });
}

function createProductWindow(url, title, origin) {
  const window = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 920,
    minHeight: 640,
    title,
    backgroundColor: "#0b0b0c",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webviewTag: false,
    },
  });
  if (origin === COURSEWELL_ORIGIN) {
    coursewellWindows.add(window);
    window.on("closed", () => coursewellWindows.delete(window));
  }
  attachWindowSecurity(window, origin);
  window.webContents.once("did-finish-load", () => {
    if (origin === COURSEWELL_ORIGIN && pendingCoursewellCallback) {
      const callback = pendingCoursewellCallback;
      pendingCoursewellCallback = undefined;
      window.webContents.send("desktop:oauth-callback", callback);
    }
  });
  window.loadURL(url);
  return window;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 920,
    minHeight: 640,
    title: "Nexus",
    backgroundColor: "#0b0b0c",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webviewTag: false,
    },
  });

  attachWindowSecurity(mainWindow, APP_ORIGIN);
  mainWindow.on("closed", () => { mainWindow = undefined; });
  mainWindow.webContents.once("did-finish-load", () => {
    if (!pendingNexusCallback) return;
    const callback = pendingNexusCallback;
    pendingNexusCallback = undefined;
    mainWindow.webContents.send("desktop:oauth-callback", callback);
  });
  mainWindow.loadURL(NEXUS_URL);
}

if (process.defaultApp && process.argv[1]) {
  app.setAsDefaultProtocolClient("com.obwoj1.nexus", process.execPath, [path.resolve(process.argv[1])]);
} else {
  app.setAsDefaultProtocolClient("com.obwoj1.nexus");
}
app.on("open-url", (event, rawUrl) => {
  event.preventDefault();
  handleAppLink(rawUrl);
});

const hasLock = app.requestSingleInstanceLock();
if (!hasLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  });

  app.whenReady().then(() => {
    log.initialize();
    ipcMain.handle("desktop:open-oauth", async (event, rawUrl) => {
      let senderOrigin;
      try {
        senderOrigin = new URL(event.senderFrame.url).origin;
      } catch {
        throw new Error("OAuth can only be started from an approved app window.");
      }
      const redirectTo = getOAuthRedirectForOrigin(senderOrigin, APP_ORIGIN, COURSEWELL_ORIGIN);
      if (!isAllowedGoogleOAuthUrl(rawUrl, redirectTo)) {
        throw new Error("The sign-in request did not match an approved Google OAuth flow.");
      }
      await shell.openExternal(rawUrl);
    });
    Menu.setApplicationMenu(Menu.buildFromTemplate([
      {
        label: "Nexus",
        submenu: [
          { label: "Open Nexus", click: () => mainWindow?.loadURL(NEXUS_URL) },
          { type: "separator" },
          { role: "quit" },
        ],
      },
      {
        label: "Products",
        submenu: [
          { label: "Coursewell", click: () => createProductWindow(COURSEWELL_URL, "Coursewell", COURSEWELL_ORIGIN) },
          { label: "Obavenus", click: () => shell.openExternal("obavenus://open").catch(() => {}) },
        ],
      },
    ]));
    app.setAppUserModelId("com.obwoj1.nexus");
    createWindow();
    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
  });
}
