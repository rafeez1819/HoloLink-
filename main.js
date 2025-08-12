// main.js
const { app, BrowserWindow, ipcMain, net, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

// ===== Stability & basics =====
app.disableHardwareAcceleration();
app.setAppUserModelId('ai.sherin.avatar.desktop');

let mainWin;
const shipState = { projectPath: '', ghToken: '' };

function createWindow() {
  mainWin = new BrowserWindow({
    width: 980,
    height: 680,
    show: true,
    webPreferences: {
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });
  mainWin.loadFile('index.html');
}
app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });

// ===== Simple helpers already in your app =====
ipcMain.handle('app/getVersion', () => app.getVersion());
ipcMain.handle('app/getAutoLaunch', () => app.getLoginItemSettings().openAtLogin);
ipcMain.handle('app/setAutoLaunch', (_e, enable) => {
  app.setLoginItemSettings({ openAtLogin: !!enable });
  return app.getLoginItemSettings().openAtLogin;
});
ipcMain.handle('app/ping', () => new Promise((resolve) => {
  const req = net.request('https://github.com/');
  req.on('response', r => resolve({ ok: r.statusCode >= 200 && r.statusCode < 400, code: r.statusCode }));
  req.on('error', e => resolve({ ok: false, code: 0, err: e.message }));
  req.end();
}));

// ===== Ship Console: utilities =====
function sendLog(line) {
  if (mainWin && !mainWin.isDestroyed()) mainWin.webContents.send('ship/log', String(line));
}

function ensureProjectSet() {
  if (!shipState.projectPath) throw new Error('Project path not set');
  if (!fs.existsSync(shipState.projectPath)) throw new Error('Project path not found');
  const pkg = path.join(shipState.projectPath, 'package.json');
  if (!fs.existsSync(pkg)) throw new Error('package.json not found in project path');
  return pkg;
}

function runCmd(cmdLine, extraEnv = {}) {
  return new Promise((resolve, reject) => {
    const proc = spawn('cmd.exe', ['/c', cmdLine], {
      cwd: shipState.projectPath || process.cwd(),
      env: { ...process.env, ...extraEnv },
      windowsHide: true,
    });
    proc.stdout.on('data', d => sendLog(d.toString()));
    proc.stderr.on('data', d => sendLog(d.toString()));
    proc.on('close', code => {
      sendLog(`\n[exit ${code}] ${cmdLine}\n`);
      code === 0 ? resolve() : reject(new Error(`Command failed (${code}): ${cmdLine}`));
    });
  });
}

// ===== Ship Console: IPC handlers =====
ipcMain.handle('ship/selectProject', async () => {
  const r = await dialog.showOpenDialog(mainWin, { properties: ['openDirectory'] });
  if (r.canceled || !r.filePaths?.[0]) return { ok: false };
  shipState.projectPath = r.filePaths[0];
  return { ok: true, path: shipState.projectPath };
});
ipcMain.handle('ship/setProjectPath', (_e, p) => {
  if (!fs.existsSync(p)) return { ok: false, err: 'Path does not exist' };
  const pkg = path.join(p, 'package.json');
  if (!fs.existsSync(pkg)) return { ok: false, err: 'package.json not found in path' };
  shipState.projectPath = p;
  return { ok: true, path: p };
});
ipcMain.handle('ship/setToken', (_e, token) => {
  shipState.ghToken = token || '';
  return { ok: true };
});

ipcMain.handle('ship/status', async () => {
  try {
    const pkgPath = ensureProjectSet();
    const raw = fs.readFileSync(pkgPath, 'utf8');
    const json = JSON.parse(raw);
    const build = json.build || {};
    const winTarget = build.win?.target;
    const nsis = build.nsis;
    const portable = build.portable;
    return {
      ok: true,
      version: json.version,
      hasPublishScript: !!json.scripts?.publish,
      hasPortable: Array.isArray(winTarget) ? winTarget.includes('portable') : (winTarget === 'portable'),
      nsisName: nsis?.artifactName,
      portableName: portable?.artifactName,
      repo: json.repository?.url || '',
      path: shipState.projectPath,
    };
  } catch (e) {
    return { ok: false, err: e.message };
  }
});

ipcMain.handle('ship/writeGitignore', async () => {
  ensureProjectSet();
  const gi = `
# Node / Electron
node_modules/
build-out/
dist/
out/
release/
npm-debug.log*
yarn-error.log*
pnpm-debug.log*
*.map
*.asar
*.pdb

# Release artifacts
*.exe
*.blockmap
*.dmg
*.AppImage
*.snap
*.msi
*.zip
*.7z

# OS junk
.DS_Store
Thumbs.db
`;
  fs.writeFileSync(path.join(shipState.projectPath, '.gitignore'), gi.trimStart(), 'utf8');

  const ga = `
* text=auto eol=lf
*.bat text eol=crlf
*.ps1 text eol=crlf
*.exe binary
*.dll binary
*.ico binary
*.asar binary
*.blockmap binary
*.png binary
*.jpg binary
`;
  fs.writeFileSync(path.join(shipState.projectPath, '.gitattributes'), ga.trimStart(), 'utf8');
  return { ok: true };
});

ipcMain.handle('ship/fixPackageJson', async () => {
  const pkgPath = ensureProjectSet();
  const data = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

  // Ensure basics
  data.type = 'commonjs';
  data.main = 'main.js';
  data.scripts = {
    ...(data.scripts || {}),
    start: 'electron .',
    clean: 'rimraf build-out',
    dist: 'npm run clean && electron-builder --win',
    publish: 'npm run clean && electron-builder --win --publish always',
  };

  // Build block: nsis + portable with distinct artifact names
  data.build = {
    ...(data.build || {}),
    appId: 'ai.sherin.avatar.desktop',
    productName: 'Sherin Avatar Desktop',
    icon: 'build/icon.ico',
    directories: { output: 'build-out' },
    win: { target: ['nsis', 'portable'] },
    nsis: { oneClick: true, perMachine: false, artifactName: 'Sherin-Avatar-Desktop-Setup-${version}.${ext}' },
    portable: { artifactName: 'Sherin-Avatar-Desktop-Portable-${version}.${ext}' },
    publish: [{ provider: 'github', owner: 'rafeez1819', repo: 'HoloLink-' }],
  };

  // Dependencies (preserve existing & ensure required)
  data.dependencies = { ...(data.dependencies || {}), 'electron-log': '^5.4.2', 'electron-updater': '^6.6.2' };
  data.devDependencies = { ...(data.devDependencies || {}), electron: '^31.7.7', 'electron-builder': '^24.13.3', rimraf: '^6.0.0' };

  fs.writeFileSync(pkgPath, JSON.stringify(data, null, 2), 'utf8');
  return { ok: true, version: data.version };
});

ipcMain.handle('ship/bumpPatch', async () => {
  ensureProjectSet();
  await runCmd('npm version patch --no-git-tag-version');
  return { ok: true };
});

ipcMain.handle('ship/publish', async () => {
  ensureProjectSet();
  const env = {};
  if (shipState.ghToken) env.GH_TOKEN = shipState.ghToken;
  env.CSC_IDENTITY_AUTO_DISCOVERY = 'false';

  // Optional pre-clean to avoid stale outputs
  try { await runCmd('npm run clean'); } catch { /* ignore */ }

  await runCmd('npm run publish', env);
  return { ok: true };
});
