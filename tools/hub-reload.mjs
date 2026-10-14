// The front door reloads itself when a newer hub is out (Daniel, 14 Oct 2026: pupils signed in still saw the old page
// after an update; a laptop opened from sleep shows the page it already had). In a real browser, with version.txt
// answered by this test:
//   • the same stamp, or an OLDER one: no reload;
//   • a NEWER stamp when the page is shown again: the page reloads, at the same address (its #section kept);
//   • not while a box has the focus; not twice for the same stamp (an old copy kept by a cache cannot loop);
//   • a quiet minute between asks (only a page restored by Back asks at once); the labs script is never asked.
//   node tools/hub-reload.mjs [base url, default http://127.0.0.1:8787/hubs/biology-hub/] [--hub <a hub.js to test instead>]
// Needs the estate served locally (python3 -m http.server 8787 --bind 127.0.0.1, from the Biology Hub folder).
// On the hub.js from before this change, the "NEWER stamp" checks fail.
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const argv = process.argv.slice(2), opt = k => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : null; };
const BASE = argv.find(a => /^https?:/.test(a)) || 'http://127.0.0.1:8787/hubs/biology-hub/';
const HUB = opt('hub') ? readFileSync(opt('hub'), 'utf8') : null;
const FAKE_GSI = `window.google = { accounts: { id: { initialize() {}, renderButton(el) { el.innerHTML = '<div style="height:40px;width:240px">Sign in</div>'; },
  prompt(cb) { cb && cb({ isNotDisplayed: () => true, isSkippedMoment: () => false, isDismissedMoment: () => false }); }, disableAutoSelect() {}, cancel() {} } } };`;

const port = 9500 + (process.pid % 200), prof = mkdtempSync(join(tmpdir(), 'hubreload-'));
const proc = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', ['--headless=new', '--remote-debugging-port=' + port,
  '--user-data-dir=' + prof, '--no-first-run', '--window-size=1280,900', 'about:blank'], { stdio: 'ignore' });
let info; for (let i = 0; i < 100; i++) { try { info = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); if (info.length) break; } catch {} await new Promise(r => setTimeout(r, 100)); }
const ws = new WebSocket(info.find(t => t.type === 'page').webSocketDebuggerUrl); await new Promise(r => { ws.onopen = r; });
let id = 0; const wait = new Map(), errors = [];
const send = (method, params = {}) => new Promise(r => { const n = ++id; wait.set(n, r); ws.send(JSON.stringify({ id: n, method, params })); });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let VER = '0', asks = 0, labsAsked = 0, loads = 0; const wrongAsks = [];
ws.onmessage = async e => {
  const m = JSON.parse(e.data);
  if (m.id && wait.has(m.id)) { wait.get(m.id)(m.result || m); wait.delete(m.id); return; }
  if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
  if (m.method === 'Page.loadEventFired') loads++;
  if (m.method !== 'Fetch.requestPaused') return;
  const u = m.params.request.url, rid = m.params.requestId;
  const answer = (body, type) => send('Fetch.fulfillRequest', { requestId: rid, responseCode: 200,
    responseHeaders: [{ name: 'Content-Type', value: type }, { name: 'Cache-Control', value: 'no-store' }], body: Buffer.from(body).toString('base64') });
  if (/\/version\.txt/.test(u)) {   /* only the hub's own version.txt, beside index.html, is answered: a wrong address gets the real 404 */
    if (u.split('?')[0] !== new URL('version.txt', BASE).href) { wrongAsks.push(u.split('?')[0]); return send('Fetch.continueRequest', { requestId: rid }); }
    asks++; return answer(VER + '\n', 'text/plain');
  }
  if (/accounts\.google\.com\/gsi\/client/.test(u)) return answer(FAKE_GSI, 'text/javascript');
  if (/script\.google(usercontent)?\.com/.test(u)) { labsAsked++; return answer('{}', 'application/json'); }
  if (HUB && /\/js\/hub\.js/.test(u)) return answer(HUB, 'text/javascript');
  return send('Fetch.continueRequest', { requestId: rid });
};
await send('Page.enable'); await send('Runtime.enable');
await send('Fetch.enable', { patterns: [{ urlPattern: '*version.txt*' }, { urlPattern: '*accounts.google.com/gsi/client*' },
  { urlPattern: '*script.google*' }, { urlPattern: '*/js/hub.js*' }] });
const js = async (expr) => (await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true })).result?.value;
const R = []; const check = (name, ok, detail) => { R.push(!!ok); console.log((ok ? 'PASS ' : 'FAIL ') + name + (ok || detail === undefined ? '' : '  — ' + JSON.stringify(detail))); };
const shownAgain = (restored) => js(restored
  ? `window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })); 1`
  : `document.dispatchEvent(new Event('visibilitychange')); 1`);

const START = BASE + '#from-the-test';
await send('Page.navigate', { url: START }); await sleep(2500);
const MINE = Number(await js(`(([...document.scripts].map(s => s.src).find(s => /\\/js\\/hub\\.js\\?v=/.test(s)) || '').match(/v=(\\d+)/) || [])[1]`));
check('the page knows its own stamp (the ?v= of js/hub.js)', MINE > 0, MINE);
const before = loads, labs0 = labsAsked;

VER = String(MINE); await shownAgain(true); await sleep(1200);
check('the same stamp: no reload', loads === before && asks === 1, { loads: loads - before, asks });
VER = String(MINE - 100); await shownAgain(true); await sleep(1200);
check('an OLDER stamp (a cache behind the page): no reload', loads === before && asks === 2, { loads: loads - before, asks });
VER = String(MINE + 1);
await js(`(() => { const i = document.createElement('input'); i.id = 'typing'; document.body.appendChild(i); i.focus(); return 1; })()`);
await shownAgain(true); await sleep(1200);
check('a NEWER stamp while a box has the focus: no reload (nothing typed is lost)', loads === before, loads - before);
await js(`document.getElementById('typing').blur(); 1`);
await shownAgain(true); await sleep(2500);
check('a NEWER stamp when the page is restored: the page reloads', loads === before + 1, loads - before);
check('…at the same address (its #section kept)', (await js('location.href')) === START, await js('location.href'));
const afterOne = loads;
await shownAgain(true); await sleep(1500);
check('the same newer stamp again (an old copy still served): no second reload', loads === afterOne, loads - afterOne);
const asked = asks; await shownAgain(false); await shownAgain(false); await sleep(800);
check('coming back to the tab twice within a minute: at most one ask', asks - asked <= 1, asks - asked);
check('the labs script is never asked by it', labsAsked === labs0, labsAsked - labs0);
check('it asks the hub\'s own version.txt (beside index.html), never another address', !wrongAsks.length, wrongAsks.slice(0, 2));
check('no script error', !errors.length, errors.slice(0, 3));

console.log(`\n${R.filter(Boolean).length}/${R.length} passed`);
ws.close(); proc.kill(); await sleep(300); try { rmSync(prof, { recursive: true, force: true }); } catch {}
process.exit(R.every(Boolean) ? 0 : 1);
