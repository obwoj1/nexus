const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("nexusDesktop", {
  openOAuthUrl: (url) => ipcRenderer.invoke("desktop:open-oauth", url),
  onOAuthCallback: (callback) => {
    if (typeof callback !== "function") return () => {};
    const listener = (_event, url) => callback(url);
    ipcRenderer.on("desktop:oauth-callback", listener);
    return () => ipcRenderer.removeListener("desktop:oauth-callback", listener);
  },
});
