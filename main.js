// main.js
const { app, BrowserWindow, ipcMain, net, dialog } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 900,
    height: 600,
    webPreferences: {
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  win.loadFile('index.html');

  // Silent update check shortly after launch
  setTimeout(() => autoUpdater.checkForUpdatesAndNotify(), 3000);
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// IPC handlers
ipcMain.handle('app/getVersion', () => app.getVersion());

ipcMain.handle('app/getAutoLaunch', () => {
  return app.getLoginItemSettings().openAtLogin;
});

ipcMain.handle('app/setAutoLaunch', (_e, enable) => {
  app.setLoginItemSettings({ openAtLogin: !!enable });
  return app.getLoginItemSettings().openAtLogin;
});

ipcMain.handle('app/ping', () => new Promise((resolve) => {
  const req = net.request('https://github.com/');
  req.on('response', r =>
    resolve({ ok: r.statusCode >= 200 && r.statusCode < 400, code: r.statusCode })
  );
  req.on('error', e => resolve({ ok: false, code: 0, err: e.message }));
  req.end();
}));

// Optional UX when update is ready
autoUpdater.on('update-downloaded', () => {
  const win = BrowserWindow.getAllWindows()[0];
  if (!win) return;
  dialog.showMessageBox(win, {
    type: 'info',
    message: 'Update ready. Restart to install now?',
    buttons: ['Restart now', 'Later'],
    defaultId: 0,
    cancelId: 1,
  }).then(r => { if (r.response === 0) autoUpdater.quitAndInstall(); });
});
