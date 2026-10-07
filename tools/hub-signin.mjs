// The front door's sign-in card, in a real browser, with a fake Google and a slow labs script (Daniel, 7 Oct 2026:
// coming back to the hub from the assessment system "it does the checking again… can it not save the check-in?", and
// "once I'm signed in, no matter if I go back… it stays signed in").
//   node tools/hub-signin.mjs [base url, default http://127.0.0.1:8787/hubs/biology-hub/] [--hub <a hub.js to test instead>]
// Needs the estate served locally. Nobody signs in: Google's script is replaced by a stand-in whose quiet renewal never
// works (as so often for real), and the labs script by one that answers after three seconds.
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const argv = process.argv.slice(2), opt = k => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : null; };
const BASE = argv.find(a => /^https?:/.test(a)) || 'http://127.0.0.1:8787/hubs/biology-hub/';
const HUB = opt('hub') ? readFileSync(opt('hub'), 'utf8') : null;
const TP = 'https://script.google.com/macros/s/AKfycbTEACHERPAGE0000000000/exec?page=teachers';
const ME = { email: 'teacher.test@nlcsjeju.kr', name: 'Test Teacher' };
const jwt = (o) => 'h.' + Buffer.from(JSON.stringify(o)).toString('base64url') + '.s';
const token = (who, minutes) => { const exp = Math.floor(Date.now() / 1000) + minutes * 60; return { token: jwt({ ...who, exp }), name: who.name, email: who.email, exp }; };
const mine = (who, extra) => ({ email: who.email, teacher: true, reflected: 0, assessments: null, unfinished: 0, practice: false, myAssessments: '', at: Date.now() - 3600e3, ...extra });

const FAKE_GSI = `window.google = { accounts: { id: {
  initialize(c) { window.__gsi = c; },
  renderButton(el) { el.innerHTML = '<div class="fake-gsi" style="height:40px;width:240px">Sign in with Google</div>'; },
  prompt(cb) { setTimeout(() => cb && cb({ isNotDisplayed: () => true, isSkippedMoment: () => false, isDismissedMoment: () => false }), 80); },
  disableAutoSelect() {}, cancel() {} } } };`;

const port = 9700 + (process.pid % 200), prof = mkdtempSync(join(tmpdir(), 'hubsignin-'));
const proc = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', ['--headless=new', '--remote-debugging-port=' + port,
  '--user-data-dir=' + prof, '--no-first-run', '--window-size=1280,900', 'about:blank'], { stdio: 'ignore' });
let info; for (let i = 0; i < 100; i++) { try { info = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); if (info.length) break; } catch {} await new Promise(r => setTimeout(r, 100)); }
const ws = new WebSocket(info.find(t => t.type === 'page').webSocketDebuggerUrl); await new Promise(r => { ws.onopen = r; });
let id = 0; const wait = new Map(), errors = [];
const send = (method, params = {}) => new Promise(r => { const n = ++id; wait.set(n, r); ws.send(JSON.stringify({ id: n, method, params })); });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let asked = 0;
ws.onmessage = async e => {
  const m = JSON.parse(e.data);
  if (m.id && wait.has(m.id)) { wait.get(m.id)(m.result || m); wait.delete(m.id); return; }
  if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
  if (m.method !== 'Fetch.requestPaused') return;
  const { requestId, request } = m.params, u = request.url;
  const ok = (body, type, delay = 0) => setTimeout(() => send('Fetch.fulfillRequest', { requestId, responseCode: 200,
    responseHeaders: [{ name: 'Content-Type', value: type }, { name: 'Access-Control-Allow-Origin', value: '*' }],
    body: Buffer.from(body).toString('base64') }), delay);
  if (/accounts\.google\.com\/gsi\/client/.test(u)) return ok(FAKE_GSI, 'text/javascript');
  if (HUB && /\/js\/hub\.js/.test(u)) return ok(HUB, 'text/javascript');
  if (/script\.google(usercontent)?\.com/.test(u)) {
    let j = {}; try { j = JSON.parse(request.postData || '{}'); } catch {}
    if (j.action === 'record') { asked++; return ok(JSON.stringify({ ok: true, name: ME.name, teacher: true, teacherPage: TP, reflected: 0, practice: false }), 'application/json', 3000); }
    return ok(JSON.stringify({ ok: false, why: 'not set up' }), 'application/json');
  }
  send('Fetch.continueRequest', { requestId });
};
await send('Runtime.enable'); await send('Page.enable');
await send('Fetch.enable', { patterns: [{ urlPattern: '*accounts.google.com/gsi/client*' }, { urlPattern: '*script.google*' }, { urlPattern: '*/js/hub.js*' }] });
const ev = async expr => (await send('Runtime.evaluate', { expression: `(async()=>{${expr}})()`, awaitPromise: true, returnByValue: true })).result?.value;
const CARD = `const vis = i => { const e = document.getElementById(i); return !!e && !e.hidden && e.getClientRects().length > 0; };
  // (the door beside the hero: on the front page the corner shows who is signed in, and the door stands among the doors)
  const sys = [...document.querySelectorAll('#entryDoors a')].find(a => !a.hidden && (a.getAttribute('href') || '').startsWith('https://script.google.com/'));
  return { door: sys ? 'Assessment system' : null, href: sys ? sys.getAttribute('href') : null,
           who: vis('acctWho') ? document.getElementById('acctWhoAct').textContent : null,
           button: vis('acctBtn') ? document.getElementById('acctBtnAct').textContent : null,
           google: vis('acctGsi'), signOut: vis('acctFoot'),
           kept: JSON.parse(localStorage.getItem('biology-hub.mine') || 'null') };`;

async function open(store) {
  await send('Page.navigate', { url: new URL('../../robots-none.txt', BASE).href }); await sleep(300);
  await ev(`localStorage.clear(); const s = ${JSON.stringify(store)}; for (const k in s) localStorage.setItem(k, JSON.stringify(s[k]));`);
  asked = 0;
  await send('Page.navigate', { url: BASE + '?t=' + Date.now() });
  for (let i = 0; i < 100 && !(await ev(`return document.readyState === 'complete'`)); i++) await sleep(50);
}
let pass = 0, fail = 0;
const check = (name, ok, got) => { if (ok) pass++; else fail++; console.log((ok ? '  ✓ ' : '  ✗ ') + name + (ok ? '' : '   got: ' + JSON.stringify(got))); };

console.log('A. teacher, signed in, the door remembered: it stands at once, the check runs quietly');
await open({ 'biology.signin': token(ME, 50), 'biology-hub.mine': mine(ME, { teacherPage: TP }) });
await sleep(700); let c = await ev(CARD);
check('the Assessment system door at once (before the 3 s answer)', c.door === 'Assessment system' && c.href === TP, c);
check('never "Checking…"', !/Checking/.test(c.button || ''), c);
await sleep(3300); c = await ev(CARD);
check('after the answer: still the door, the check made once', c.door === 'Assessment system' && asked === 1, { c, asked });

console.log('B. teacher, signed in, remembered before this change (no address kept): checks, then keeps the address');
await open({ 'biology.signin': token(ME, 50), 'biology-hub.mine': mine(ME, {}) });
await sleep(700); c = await ev(CARD);
check('"Checking…" while it asks (nothing to show yet)', /Checking/.test(c.button || ''), c);
await sleep(3300); c = await ev(CARD);
check('the door after the answer, and its address now kept', c.door === 'Assessment system' && c.kept && c.kept.teacherPage === TP, c);

console.log('C. teacher, Google\'s hour is up, Google will not renew without a click: still signed in');
await open({ 'biology.signin': token(ME, -30), 'biology-hub.mine': mine(ME, { teacherPage: TP }) });
await sleep(1500); c = await ev(CARD);
check('the door stands, no Google button', c.door === 'Assessment system' && !c.google, c);
check('"Sign out" offered', c.signOut, c);

console.log('D. Google\'s hour is up and nothing remembered: Google\'s button, as before');
await open({ 'biology.signin': token(ME, -30) });
await sleep(1500); c = await ev(CARD);
check('Google\'s button, no door', c.google && !c.door, c);

console.log('E. signed out (no sign-in kept), a door remembered: never shown');
await open({ 'biology-hub.mine': mine(ME, { teacherPage: TP }) });
await sleep(1000); c = await ev(CARD);
check('Google\'s button, no door', c.google && !c.door, c);

console.log('F. Google\'s hour is up, the door remembered for SOMEBODY ELSE: never shown');
await open({ 'biology.signin': token(ME, -30), 'biology-hub.mine': mine({ email: 'other@nlcsjeju.kr' }, { teacherPage: TP }) });
await sleep(1500); c = await ev(CARD);
check('Google\'s button, no door', c.google && !c.door, c);

console.log('G. remembered card after the hour, then "Sign out": signed out, the memory gone');
await open({ 'biology.signin': token(ME, -30), 'biology-hub.mine': mine(ME, { teacherPage: TP }) });
await sleep(1500); await ev(`document.getElementById('acctOut').click();`); await sleep(500); c = await ev(CARD);
check('Google\'s button, no door, nothing kept', c.google && !c.door && !c.kept && !(await ev(`return localStorage.getItem('biology.signin')`)), c);

console.log('H. remembered more than 30 days ago: not shown after the hour');
await open({ 'biology.signin': token(ME, -30), 'biology-hub.mine': mine(ME, { teacherPage: TP, at: Date.now() - 31 * 864e5 }) });
await sleep(1500); c = await ev(CARD);
check('Google\'s button, no door', c.google && !c.door, c);

const PUPIL = { email: 'pupil.test@nlcsjeju.kr', name: 'Test Pupil' };
const MA = 'https://script.google.com/macros/s/AKfycbREFLECTION000000000000/exec?page=student';
const pupilMine = extra => ({ ...mine(PUPIL, {}), teacher: false, reflected: 2, assessments: 3, practice: true, myAssessments: MA, ...extra });
console.log('I. a pupil, signed in, My assessments remembered: at once, as before');
await open({ 'biology.signin': token(PUPIL, 50), 'biology-hub.mine': pupilMine({}) });
await sleep(700); c = await ev(CARD);
check('My assessments door at once', c.href === MA && !c.google, c);

console.log('J. a pupil, Google\'s hour is up: still signed in, the door stands');
await open({ 'biology.signin': token(PUPIL, -30), 'biology-hub.mine': pupilMine({}) });
await sleep(1500); c = await ev(CARD);
check('no Google button, signed in, the door', !c.google && c.signOut && c.href === MA, c);

if (errors.length) { fail++; console.log('  ✗ page errors: ' + errors.join(' | ')); }
console.log(`hub-signin: ${pass} passed, ${fail} failed`);
ws.close(); proc.kill(); try { rmSync(prof, { recursive: true, force: true }); } catch {}
process.exit(fail ? 1 : 0);
