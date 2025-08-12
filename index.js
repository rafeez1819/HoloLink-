// index.js
window.addEventListener('DOMContentLoaded', async () => {
  // Version label
  const v = await window.appAPI.getVersion();
  const vSpan = document.getElementById('version');
  if (vSpan) vSpan.textContent = v;

  // Auto-start checkbox
  const cb = document.getElementById('autoStart');
  if (cb) {
    cb.checked = await window.appAPI.getAutoLaunch();
    cb.addEventListener('change', async () => {
      cb.checked = await window.appAPI.setAutoLaunch(cb.checked);
    });
  }

  // Ping button
  const pingBtn = document.getElementById('pingBtn');
  if (pingBtn) {
    pingBtn.addEventListener('click', async () => {
      const r = await window.appAPI.ping();
      alert(r.ok ? `Hello Captain ✨ — Online (${r.code})` : `Network issue (${r.code || r.err})`);
    });
  }
});
