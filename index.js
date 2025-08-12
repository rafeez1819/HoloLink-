// index.js (defensive version with click logging + error display)
function byId(id){ return document.getElementById(id); }
function appendLog(s){
  const el = byId('log');
  if (!el) return;
  el.value += s.endsWith('\n') ? s : (s + '\n');
  el.scrollTop = el.scrollHeight;
}
function setStatus(text){ const el = byId('statusLine'); if (el) el.textContent = text || ''; }

function safeClick(id, handler){
  const btn = byId(id);
  if (!btn) return;
  btn.addEventListener('click', async () => {
    appendLog(`[ui] ${id} clicked`);
    try { await handler(); }
    catch (e){ appendLog(`[error] ${e?.message || e}`); setStatus(e?.message || 'Error'); }
  });
}

window.addEventListener('DOMContentLoaded', async () => {
  appendLog('[boot] renderer loaded');

  // --- App info ---
  try {
    const v = await window.appAPI.getVersion();
    const verEl = byId('version');
    if (verEl) verEl.textContent = v;
  } catch (e){ appendLog(`[warn] getVersion failed: ${e?.message || e}`); }

  // Auto-start
  try {
    const cb = byId('autoStart');
    if (cb){
      cb.checked = await window.appAPI.getAutoLaunch();
      cb.onchange = async () => { try { cb.checked = await window.appAPI.setAutoLaunch(cb.checked); } catch(e){ appendLog(`[error] autoLaunch: ${e}`); } };
    }
  } catch (e){ appendLog(`[warn] autoLaunch init failed: ${e?.message || e}`); }

  // Ping
  safeClick('pingBtn', async () => {
    const statusEl = byId('pingStatus');
    if (statusEl) statusEl.textContent = 'Checking…';
    const r = await window.appAPI.ping();
    if (statusEl) statusEl.textContent = r.ok ? `Online (${r.code})` : `Network issue (${r.code || r.err})`;
    appendLog(`[net] ping -> ${r.ok ? 'ok' : 'fail'} ${r.code || r.err || ''}`);
  });

  // Listen to backend logs (guard if shipAPI missing)
  if (window.shipAPI?.onLog) {
    window.shipAPI.onLog((line) => appendLog(String(line)));
  } else {
    appendLog('[warn] shipAPI.onLog not available (preload not loaded or blocked)');
  }

  // Browse
  safeClick('browseBtn', async () => {
    const r = await window.shipAPI.selectProject();
    if (r?.ok && r.path) byId('projectPath').value = r.path;
    setStatus(r?.ok ? `Path set: ${r.path}` : 'Browse cancelled');
  });

  // Set token
  safeClick('saveTokenBtn', async () => {
    await window.shipAPI.setToken(byId('token').value || '');
    appendLog('[ok] token set (session memory)');
  });

  // Status
  safeClick('statusBtn', async () => {
    const p = byId('projectPath').value.trim();
    if (p) await window.shipAPI.setProjectPath(p);
    const s = await window.shipAPI.status();
    if (!s.ok){ setStatus(s.err || 'Unknown error'); appendLog(`[error] status: ${s.err}`); return; }
    setStatus(`path=${s.path} | version=${s.version} | publishScript=${s.hasPublishScript?'yes':'no'} | portable=${s.hasPortable?'yes':'no'}`);
    appendLog('[ok] status read');
  });

  // Write .gitignore
  safeClick('gitignoreBtn', async () => {
    const p = byId('projectPath').value.trim();
    if (p) await window.shipAPI.setProjectPath(p);
    await window.shipAPI.writeGitignore();
    appendLog('[ok] wrote .gitignore and .gitattributes');
  });

  // Fix package.json
  safeClick('fixPkgBtn', async () => {
    const p = byId('projectPath').value.trim();
    if (p) await window.shipAPI.setProjectPath(p);
    const r = await window.shipAPI.fixPackageJson();
    if (r?.ok) appendLog(`[ok] package.json fixed (version ${r.version})`);
  });

  // Bump patch
  safeClick('bumpBtn', async () => {
    const p = byId('projectPath').value.trim();
    if (p) await window.shipAPI.setProjectPath(p);
    await window.shipAPI.bumpPatch();
    appendLog('[ok] version bumped (patch)');
  });

  // Publish
  safeClick('publishBtn', async () => {
    const p = byId('projectPath').value.trim();
    if (p) await window.shipAPI.setProjectPath(p);
    appendLog('[*] publishing… this can take a few minutes');
    await window.shipAPI.publish();
    appendLog('[ok] publish complete');
  });
});
