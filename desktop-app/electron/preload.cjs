const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("nexusDesktop", {
  openOAuthUrl: (url) => ipcRenderer.invoke("desktop:open-oauth", url),
  shareCoursewellContext: (summary) => ipcRenderer.invoke("desktop:coursewell-context:share", summary),
  getCoursewellContext: () => ipcRenderer.invoke("desktop:coursewell-context:get"),
  onCoursewellContext: (callback) => {
    if (typeof callback !== "function") return () => {};
    const listener = (_event, context) => callback(context);
    ipcRenderer.on("desktop:coursewell-context", listener);
    return () => ipcRenderer.removeListener("desktop:coursewell-context", listener);
  },
  onOAuthCallback: (callback) => {
    if (typeof callback !== "function") return () => {};
    const listener = (_event, url) => callback(url);
    ipcRenderer.on("desktop:oauth-callback", listener);
    return () => ipcRenderer.removeListener("desktop:oauth-callback", listener);
  },
});
