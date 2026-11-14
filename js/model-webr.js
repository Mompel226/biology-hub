/* model-webr.js — R inside the private model page (model.html, 14 Nov 2026), as the model page itself starts it.
   webR v0.6.0's first file is pinned by its SHA-384 in model.html's import map (the browser refuses a different file);
   the files it then loads run where they cannot read the site's sign-in (Estate atlas, security-surface). The model
   page's own script waits for window.PWebR or the webr-module-loaded event. */
import('https://webr.r-wasm.org/v0.6.0/webr.mjs').then(function (m) {
  window.PWebR = m.WebR; window.dispatchEvent(new Event('webr-module-loaded'));
}, function (e) {
  window.PWebRError = String(e && e.message || e); window.dispatchEvent(new Event('webr-module-failed'));
});
