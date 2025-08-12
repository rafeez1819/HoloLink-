// preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('appAPI', {
  getVersion: () => ipcRenderer.invoke('app/getVersion'),
  getAutoLaunch: () => ipcRenderer.invoke('app/getAutoLaunch'),
  setAutoLaunch: (enable) => ipcRenderer.invoke('app/setAutoLaunch', enable),
  ping: () => ipcRenderer.invoke('app/ping'),
});
