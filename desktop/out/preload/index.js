"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("electronAPI", {
  login: (credentials) => electron.ipcRenderer.invoke("login", credentials),
  onTrackingStatusChange: (callback) => electron.ipcRenderer.on("tracking-status", (_, status) => callback(status))
});
