// preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('appAPI', {
  getVersion: () => ipcRenderer.invoke('app/getVersion'),
  getAutoLaunch: () => ipcRenderer.invoke('app/getAutoLaunch'),
  setAutoLaunch: (enable) => ipcRenderer.invoke('app/setAutoLaunch', enable),
  ping: () => ipcRenderer.invoke('app/ping'),
});

contextBridge.exposeInMainWorld('shipAPI', {
  selectProject: () => ipcRenderer.invoke('ship/selectProject'),
  setProjectPath: (p) => ipcRenderer.invoke('ship/setProjectPath', p),
  setToken: (t) => ipcRenderer.invoke('ship/setToken', t),
  status: () => ipcRenderer.invoke('ship/status'),
  writeGitignore: () => ipcRenderer.invoke('ship/writeGitignore'),
  fixPackageJson: () => ipcRenderer.invoke('ship/fixPackageJson'),
  bumpPatch: () => ipcRenderer.invoke('ship/bumpPatch'),
  publish: () => ipcRenderer.invoke('ship/publish'),
  onLog: (cb) => ipcRenderer.on('ship/log', (_e, line) => cb(line)),
});
