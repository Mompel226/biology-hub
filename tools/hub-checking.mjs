// The front door's "Checking… · Checked at 09:14" line, in a real browser, with a fake Google and a fake labs script
// (Daniel, 13 Oct 2026: pupils signed in and said "sir, I've signed in, I cannot see anything" while the check still ran).
//   node tools/hub-checking.mjs [base url, default http://127.0.0.1:8787/hubs/biology-hub/]
//        [--hub <a hub.js to test instead>] [--html <an index.html>] [--css <a hub.css>] (the page or style of before)
//        [--open <the open edition's url, default ../igcse-biology-hub/ beside it>]
//        [--shots <folder for screenshots>]
// Needs the estate served locally. Nobody signs in: Google's script is replaced by a stand-in whose quiet renewal never
// works, and the labs script by one whose answers each case sets. A minute and the 30 s "no answer" wait are shortened
// inside the page where a case says so; the 15 s before Check again shows is waited for in real time.
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const argv = process.argv.slice(2), opt = k => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : null; };
const BASE = argv.find(a => /^https?:/.test(a) && argv[argv.indexOf(a) - 1] !== '--open') || 'http://127.0.0.1:8787/hubs/biology-hub/';
const OPEN = opt('open') || new URL('../igcse-biology-hub/', BASE).href, SHOTS = opt('shots');
const HUB = opt('hub') ? readFileSync(opt('hub'), 'utf8') : null;
const HTML = opt('html') ? readFileSync(opt('html'), 'utf8') : null, CSS = opt('css') ? readFileSync(opt('css'), 'utf8') : null;
if (SHOTS) mkdirSync(SHOTS, { recursive: true });

const PUPIL = { email: 'pupil.test@nlcsjeju.kr', name: 'Test Pupil' }, OTHER = { email: 'other.pupil@nlcsjeju.kr', name: 'Other Pupil' };
const TEACHER = { email: 'teacher.test@nlcsjeju.kr', name: 'Test Teacher' };
const TP = 'https://script.google.com/macros/s/AKfycbTEACHERPAGE0000000000/exec?page=teachers';
const FORM = 'https://script.google.com/macros/s/AKfycbTESTFORM000000000000/exec';
const MA = 'https://script.google.com/macros/s/AKfycbREFLECTION000000000000/exec?page=student';
const jwt = (o) => 'h.' + Buffer.from(JSON.stringify(o)).toString('base64url') + '.s';
const token = (who, minutes) => { const exp = Math.floor(Date.now() / 1000) + minutes * 60; return { token: jwt({ ...who, exp }), name: who.name, email: who.email, exp }; };
const cred = (who) => jwt({ ...who, exp: Math.floor(Date.now() / 1000) + 3600 });
const pupilMine = extra => ({ email: PUPIL.email, teacher: false, teacherPage: '', reflected: 2, assessments: 3, unfinished: 0,
                              practice: true, myAssessments: MA, at: Date.now() - 3600e3, ...extra });
const teacherMine = { email: TEACHER.email, teacher: true, teacherPage: TP, reflected: 0, assessments: null, unfinished: 0,
                      practice: false, myAssessments: '', at: Date.now() - 3600e3 };

/* what the fake labs script answers; each case sets it */
const NOTHING = { ok: true, teacher: false, state: 'none' };
const OPEN_T7 = () => ({ ok: true, teacher: false, state: 'open', name: 'T7 Cells', opensAt: Date.now() - 60e3, closesAt: Date.now() + 3600e3, url: FORM });
let FAKE = { record: { ok: true, name: PUPIL.name, reflected: 0, practice: false }, recordDelay: 300, test: NOTHING, testDelay: 3000, testHow: 'ok' };
let tests = 0;

const FAKE_GSI = `window.google = { accounts: { id: {
  initialize(c) { window.__gsi = c; },
  renderButton(el) { el.innerHTML = '<div class="fake-gsi" style="height:32px;width:200px;border-radius:16px;background:#202124;color:#fff;font:500 13px/32px sans-serif;text-align:center">Sign in with Google</div>'; },
  prompt(cb) { setTimeout(() => cb && cb({ isNotDisplayed: () => true, isSkippedMoment: () => false, isDismissedMoment: () => false }), 80); },
  disableAutoSelect() {}, cancel() {} } } };`;
/* a case that cannot wait a real minute: the page's own 60 s and 30 s waits run 100 times faster */
const SHORT = `(() => { let on = false; try { on = !!JSON.parse(localStorage.getItem('__shortWaits') || 'false'); } catch (e) {}
  if (!on) return; const st = window.setTimeout;
  window.setTimeout = function (f, ms, ...a) { if (ms === 60000 || ms === 30000) ms = ms / 100; return st.call(this, f, ms, ...a); }; })();`;

const port = 9500 + (process.pid % 200), prof = mkdtempSync(join(tmpdir(), 'hubchecking-'));
const proc = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', ['--headless=new', '--remote-debugging-port=' + port,
  '--user-data-dir=' + prof, '--no-first-run', '--hide-scrollbars', '--window-size=1280,900', 'about:blank'], { stdio: 'ignore' });
let info; for (let i = 0; i < 100; i++) { try { info = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); if (info.length) break; } catch {} await new Promise(r => setTimeout(r, 100)); }
const ws = new WebSocket(info.find(t => t.type === 'page').webSocketDebuggerUrl); await new Promise(r => { ws.onopen = r; });
let id = 0; const wait = new Map(), errors = [];
const send = (method, params = {}) => new Promise(r => { const n = ++id; wait.set(n, r); ws.send(JSON.stringify({ id: n, method, params })); });
const sleep = ms => new Promise(r => setTimeout(r, ms));
ws.onmessage = async e => {
  const m = JSON.parse(e.data);
  if (m.id && wait.has(m.id)) { wait.get(m.id)(m.result || m); wait.delete(m.id); return; }
  if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
  if (m.method !== 'Fetch.requestPaused') return;
  const { requestId, request } = m.params, u = request.url;
  const ok = (body, type, delay = 0, code = 200) => setTimeout(() => send('Fetch.fulfillRequest', { requestId, responseCode: code,
    responseHeaders: [{ name: 'Content-Type', value: type }, { name: 'Access-Control-Allow-Origin', value: '*' }],
    body: Buffer.from(body).toString('base64') }), delay);
  if (/accounts\.google\.com\/gsi\/client/.test(u)) return ok(FAKE_GSI, 'text/javascript');
  if (HUB && /\/js\/hub\.js/.test(u)) return ok(HUB, 'text/javascript');
  if (CSS && /\/css\/hub\.css/.test(u)) return ok(CSS, 'text/css');
  if (HTML && /\/biology-hub\/(index\.html)?(\?|$)/.test(u)) return ok(HTML, 'text/html');
  if (/script\.google(usercontent)?\.com/.test(u)) {
    let j = {}; try { j = JSON.parse(request.postData || '{}'); } catch {}
    if (j.action === 'record') return ok(JSON.stringify(FAKE.record), 'application/json', FAKE.recordDelay);
    if (j.action === 'test') {
      tests++;
      const how = FAKE.testHow, body = typeof FAKE.test === 'function' ? FAKE.test() : FAKE.test;
      if (how === 'hang') return;                                   /* no answer, ever */
      if (how === 'neterr') return setTimeout(() => send('Fetch.failRequest', { requestId, errorReason: 'Failed' }), FAKE.testDelay);
      if (how === 'http500') return ok('busy', 'text/plain', FAKE.testDelay, 500);
      return ok(JSON.stringify(body), 'application/json', FAKE.testDelay);
    }
    return ok(JSON.stringify({ ok: false, why: 'not set up' }), 'application/json');
  }
  send('Fetch.continueRequest', { requestId });
};
await send('Runtime.enable'); await send('Page.enable');
await send('Page.addScriptToEvaluateOnNewDocument', { source: SHORT });
await send('Fetch.enable', { patterns: [{ urlPattern: '*accounts.google.com/gsi/client*' }, { urlPattern: '*script.google*' }, { urlPattern: '*/js/hub.js*' },
  { urlPattern: '*/css/hub.css*' }, { urlPattern: '*/biology-hub/?*' }, { urlPattern: '*/biology-hub/index.html*' }] });
const ev = async expr => (await send('Runtime.evaluate', { expression: `(async()=>{${expr}})()`, awaitPromise: true, returnByValue: true })).result?.value;
const LINE = `const vis = e => !!e && !e.hidden && e.getClientRects().length > 0, $ = i => document.getElementById(i);
  const el = $('sitCheck'), again = $('sitCheckAgain'), gsi = $('sitCheckGsi');
  return { line: vis(el) ? $('sitCheckSay').textContent : null, cls: el ? el.className : null, again: vis(again),
           google: vis(gsi) && !!gsi.querySelector('.fake-gsi'),
           test: vis($('sit')), go: vis($('sitGo')) ? $('sitGo').getAttribute('href') : null, fb: vis($('fbk')), rfl: vis($('rfl')),
           note: vis($('sitNote')) ? $('sitNote').textContent : null,
           corner: vis($('acctBtn')) ? $('acctBtnAct').textContent : null, cornerFor: vis($('acctFor')) ? $('acctFor').textContent : null,
           cornerGoogle: vis($('acctGsi')), door: !!document.querySelector('#entryDoors a[href="${MA}"]:not([hidden])') };`;
const line = () => ev(LINE);

async function open(store, base = BASE) {
  await send('Page.navigate', { url: new URL('../../robots-none.txt', base).href }); await sleep(300);
  await ev(`localStorage.clear(); const s = ${JSON.stringify(store)}; for (const k in s) localStorage.setItem(k, JSON.stringify(s[k]));`);
  tests = 0;
  await send('Page.navigate', { url: base + '?t=' + Date.now() });
  for (let i = 0; i < 100 && !(await ev(`return document.readyState === 'complete'`)); i++) await sleep(50);
}
async function shot(name) {
  if (!SHOTS) return;
  const r = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  if (r.data) writeFileSync(join(SHOTS, name + '.png'), Buffer.from(r.data, 'base64'));
}
async function until(test, ms) { const t0 = Date.now(); let v; while (Date.now() - t0 < ms) { v = await line(); if (test(v)) return v; await sleep(150); } return v; }
let pass = 0, fail = 0;
const check = (name, ok, got) => { if (ok) pass++; else fail++; console.log((ok ? '  ✓ ' : '  ✗ ') + name + (ok ? '' : '   got: ' + JSON.stringify(got))); };
const CHECKING = 'Checking if you have a test, a reflection or new feedback\u2026';
const AT = /^Checked at \d\d:\d\d\.$/;

console.log('A. a pupil signs in and the answer takes 3 s: "Checking…" at once, then what it found, then Check again');
FAKE = { ...FAKE, record: { ok: true, name: PUPIL.name, reflected: 0, practice: false }, test: NOTHING, testDelay: 3000, testHow: 'ok' };
await open({ 'biology.signin': token(PUPIL, 50) });
let t0 = Date.now(), c = await until(v => v.line, 1500);
check('"Checking…" before the answer, with no Check again', c.line === CHECKING && !c.again && /is-checking/.test(c.cls), c);
await shot('1-checking');
c = await until(v => /^Checked/.test(v.line || ''), 5000);
check('after the answer: the time, and that nothing is open', /^Checked at \d\d:\d\d\. You have no test, reflection or new feedback now\.$/.test(c.line || '') && /is-done/.test(c.cls), c);
check('no Check again yet (15 s after the check began)', !c.again, c);
c = await until(v => v.again, 16000);
check('Check again, 15 s after the check began', c.again && Date.now() - t0 >= 14000, { c, after: Date.now() - t0 });
await shot('2-nothing-for-you');
FAKE.test = OPEN_T7;
await ev(`document.getElementById('sitCheckAgain').click()`);
c = await until(v => v.line === CHECKING, 1500);
check('pressed: "Checking…" again, the button gone while it asks', c.line === CHECKING && !c.again, c);
c = await until(v => v.test, 5000);
check('the test that opened meanwhile shows, with its link', c.test && c.go === FORM && tests === 2, { c, tests });
check('and the line says only when it checked', AT.test(c.line || ''), c);
await shot('3-test-open');

console.log('B. a pupil seated for a test with no start time yet: told so, and the page asks again by itself');
FAKE = { ...FAKE, test: { ok: true, teacher: false, state: 'waiting', name: 'T7 Cells' }, testDelay: 300, testHow: 'ok' };
await open({ 'biology.signin': token(PUPIL, 50), __shortWaits: true });
c = await until(v => /^Checked/.test(v.line || ''), 3000);
check('"Your test “T7 Cells” has not started yet", and that the page checks again', /^Checked at \d\d:\d\d\. Your test \u201cT7 Cells\u201d has not started yet\. This page checks again every minute\.$/.test(c.line || '') && !c.test, c);
await shot('4-not-started');
FAKE.test = OPEN_T7;
c = await until(v => v.test, 3000);
check('the teacher starts it: the card and its link come by themselves', c.test && c.go === FORM && tests === 2, { c, tests });
await sleep(1500);
check('then it stops asking (the test is open)', tests === 2, { tests });

console.log('C. the check fails: said so, with Check again; a later failure keeps the cards already shown');
FAKE = { ...FAKE, test: NOTHING, testDelay: 300, testHow: 'http500' };
await open({ 'biology.signin': token(PUPIL, 50) });
c = await until(v => /could not/.test(v.line || ''), 3000);
check('"The hub could not check."', c.line === 'The hub could not check.' && /is-failed/.test(c.cls) && !c.test, c);
await shot('5-failed');
c = await until(v => v.again, 16000);
check('Check again, after the 15 s', c.again, c);
FAKE.testHow = 'ok'; FAKE.test = () => ({ ok: true, teacher: false, state: 'done', name: 'T7 Cells',
  feedback: { name: 'T6 Enzymes', at: Date.now() - 3600e3, url: FORM + '?page=feedback&test=T6', more: 0 } });
await ev(`document.getElementById('sitCheckAgain').click()`);
c = await until(v => v.fb, 3000);
check('pressed: the feedback card, and only the time on the line', c.fb && AT.test(c.line || ''), c);
c = await until(v => v.again, 16000);
FAKE.testHow = 'neterr';
await ev(`document.getElementById('sitCheckAgain').click()`);
c = await until(v => /could not/.test(v.line || ''), 3000);
check('a failed check keeps the feedback card and says when it was checked', c.fb && /^Checked at \d\d:\d\d\. The hub could not check again\.$/.test(c.line || ''), c);

console.log('D. no answer at all: after the wait, said so (the 30 s shortened)');
FAKE = { ...FAKE, testHow: 'hang' };
await open({ 'biology.signin': token(PUPIL, 50), __shortWaits: true });
c = await until(v => /could not/.test(v.line || ''), 3000);
check('"The hub could not check." instead of "Checking…" for ever', c.line === 'The hub could not check.', c);

console.log('E. signed in with a personal account: no line, the corner says which account to use');
FAKE = { ...FAKE, record: { ok: false, why: 'not a school account', email: 'someone@gmail.com', domain: 'nlcsjeju.kr' }, recordDelay: 600,
         test: { ok: false, why: 'not a school account', email: 'someone@gmail.com', domain: 'nlcsjeju.kr' }, testDelay: 300, testHow: 'ok' };
await open({ 'biology.signin': token({ email: 'someone@gmail.com', name: 'Someone' }, 50) });
c = await until(v => v.cornerGoogle && !v.line, 3000);
check('no line; Google\'s button in the corner with "Use your …nlcsjeju.kr account"', !c.line && c.cornerGoogle && /nlcsjeju\.kr account/.test(c.cornerFor || ''), c);

console.log('F. Google\'s sign-in is too old to check with (the remembered card): said so, with Google\'s button; one press checks');
FAKE = { ...FAKE, record: { ok: true, name: PUPIL.name, reflected: 2, assessments: 3, practice: true, myAssessments: MA }, recordDelay: 300,
         test: OPEN_T7, testDelay: 1000, testHow: 'ok' };
await open({ 'biology.signin': token(PUPIL, -30), 'biology-hub.mine': pupilMine({}) });
c = await until(v => v.google, 3000);
check('"To check …, sign in again." with Google\'s button in the line', c.line === 'To check if you have a test, a reflection or new feedback, sign in again.' && c.google && /is-signin/.test(c.cls), c);
check('the corner keeps the remembered card (no second Google button) and nothing was asked', !c.cornerGoogle && c.door && tests === 0, { c, tests });
await shot('6-sign-in-again');
await ev(`window.__gsi.callback({ credential: ${JSON.stringify(cred(PUPIL))} })`);
c = await until(v => v.line === CHECKING, 1500);
check('pressed: "Checking…"', c.line === CHECKING && !c.google, c);
c = await until(v => v.test, 3000);
check('then the open test, its link and the time', c.test && c.go === FORM && AT.test(c.line || '') && tests === 1, { c, tests });

console.log('G. a teacher: no line in teacher mode; in test mode the line, with the reasons in the note above it');
FAKE = { ...FAKE, record: { ok: true, name: TEACHER.name, teacher: true, teacherPage: TP, reflected: 0, practice: false }, recordDelay: 300,
         test: { ok: true, teacher: true, state: 'none', why: ['\u201cT7\u201d does not list teacher.test@nlcsjeju.kr on any of its Marks tabs'] },
         testDelay: 600, testHow: 'ok' };
await open({ 'biology.signin': token(TEACHER, 50), 'biology-hub.mine': teacherMine });
await sleep(300); c = await line();
check('teacher mode: no line while it asks', !c.line, c);
await sleep(1200); c = await line();
check('teacher mode: no line after the answer', !c.line && !c.test, c);
await ev(`document.querySelector('#acctMode button[data-mode="test"]').click()`);
c = await until(v => v.line, 1000);
check('test mode: "Test mode · Checking…"', c.line === 'Test mode \u00b7 ' + CHECKING, c);
c = await until(v => /Checked/.test(v.line || ''), 3000);
check('then "Test mode · Checked at …" and the note says why no test shows', /^Test mode \u00b7 Checked at \d\d:\d\d\.$/.test(c.line || '') && /does not list/.test(c.note || ''), c);
await ev(`document.querySelector('#acctMode button[data-mode="teacher"]').click()`);
await sleep(1200); c = await line();
check('back to teacher mode: no line', !c.line && !c.note, c);

console.log('H. somebody else signs in (in another tab of the site): the last pupil\'s cards go at once');
FAKE = { ...FAKE, record: { ok: true, name: PUPIL.name, reflected: 0, practice: false }, test: OPEN_T7, testDelay: 300, testHow: 'ok' };
await open({ 'biology.signin': token(PUPIL, 50) });
c = await until(v => v.test, 3000);
FAKE.test = NOTHING; FAKE.testDelay = 3000;
/* another tab writes the sign-in: this page hears it through the storage event, as from a lab */
await ev(`await new Promise(r => { const f = document.createElement('iframe'); f.src = new URL('../../robots-none.txt', location.href).href;
  f.onload = () => { f.contentWindow.localStorage.setItem('biology.signin', ${JSON.stringify(JSON.stringify(token(OTHER, 50)))}); r(); };
  document.body.appendChild(f); });`);
await sleep(400); c = await line();
check('no card of the first pupil while the second is checked', !c.test && c.line === CHECKING, c);
c = await until(v => /^Checked/.test(v.line || ''), 4000);
check('the second pupil\'s answer', /You have no test/.test(c.line || '') && !c.test, c);

console.log('I. a phone, 375 px: the line wraps, nothing leaves the screen');
await send('Emulation.setDeviceMetricsOverride', { width: 375, height: 812, deviceScaleFactor: 2, mobile: true });
FAKE = { ...FAKE, test: { ok: true, teacher: false, state: 'waiting', name: 'T7 Cells and microscopes' }, testDelay: 300, testHow: 'ok' };
await open({ 'biology.signin': token(PUPIL, 50) });
c = await until(v => v.again, 17000);
const fit = await ev(`const r = id => document.getElementById(id).getBoundingClientRect();
  return { page: document.documentElement.scrollWidth, line: r('sitCheck').right, btn: r('sitCheckAgain').right, h: r('sitCheckSay').height };`);
check('the line and Check again inside 375 px, the words on several lines', fit.page <= 375 && fit.line <= 375 && fit.btn <= 375 && fit.h > 30 && c.again, { fit, c });
await shot('7-phone-not-started');
await send('Emulation.clearDeviceMetricsOverride');

console.log('K. cards: a row of their own; the corner stays level with the heading; two side by side on a laptop, a third under the first');
{
  const RFL = 'https://script.google.com/macros/s/AKfycbREFLFORM000000000000/exec';
  const three = () => ({ ...OPEN_T7(), reflect: { state: 'start', name: 'T6 Enzymes: reflection', url: RFL },
                         feedback: { name: 'T5 Diffusion', at: Date.now() - 3600e3, url: FORM + '?page=feedback&test=T5', more: 0 } });
  const geo = `const r = (id) => { const e = document.getElementById(id); if (!e || e.hidden || !e.getClientRects().length) return null; const b = e.getBoundingClientRect(); return { l: Math.round(b.left), t: Math.round(b.top), b: Math.round(b.bottom), w: Math.round(b.width) }; };
    const corner = r('acctWho') || r('acctLink') || r('acctBtn');
    return { corner, h1: (() => { const b = document.querySelector('.masthead h1').getBoundingClientRect(); return { t: Math.round(b.top), b: Math.round(b.bottom) }; })(),
             sit: r('sit'), rfl: r('rfl'), fbk: r('fbk'), line: r('sitCheck'), page: document.documentElement.scrollWidth };`;
  FAKE = { ...FAKE, record: { ok: true, name: PUPIL.name, reflected: 0, practice: false }, recordDelay: 100, test: NOTHING, testDelay: 200, testHow: 'ok' };
  await open({ 'biology.signin': token(PUPIL, 50) });
  await until((v) => /^Checked/.test(v.line || ''), 3000);
  const g0 = await ev(geo);
  FAKE.test = three;
  await open({ 'biology.signin': token(PUPIL, 50) });
  await until((v) => v.test && v.rfl && v.fb, 3000);
  await sleep(800);   // the cards' half-second slide-in has ended
  const g3 = await ev(geo);
  await shot('8-three-cards-laptop');
  check('the corner stays where it was when three cards show (level with the heading, not pushed down)',
    g0.corner && g3.corner && Math.abs(g0.corner.t - g3.corner.t) <= 1 && g3.corner.t < g3.h1.b, { g0: g0.corner, g3: g3.corner, h1: g3.h1 });
  check('two cards side by side on a 1280 px laptop (the test and its neighbour on one line), the third under the first, the line under them',
    g3.sit && g3.fbk && g3.rfl && g3.sit.t === g3.fbk.t && g3.fbk.l > g3.sit.l + g3.sit.w - 2 && g3.rfl.t >= g3.sit.b && g3.rfl.l === g3.sit.l && g3.line && g3.line.t >= g3.rfl.b,
    g3);
  await send('Emulation.setDeviceMetricsOverride', { width: 375, height: 812, deviceScaleFactor: 2, mobile: true });
  await open({ 'biology.signin': token(PUPIL, 50) });
  await until((v) => v.test && v.rfl && v.fb, 3000);
  await sleep(800);
  const gp = await ev(geo);
  await shot('9-three-cards-phone');
  check('on a phone (375 px): one card under another, nothing wider than the screen',
    gp.sit && gp.fbk && gp.rfl && gp.fbk.t >= gp.sit.b && gp.rfl.t >= gp.fbk.b && gp.page <= 375 && gp.sit.w <= 375, gp);
  await send('Emulation.clearDeviceMetricsOverride');
}

{
  console.log('J. the open edition: no sign-in, so never the line');
  await open({ 'biology.signin': token(PUPIL, 50) }, OPEN);
  await sleep(1500); c = await ev(`const e = document.getElementById('sitCheck'); return { there: !!e, hidden: !e || e.hidden };`);
  check('the line stays hidden', c.hidden, c);
}

if (errors.length) { fail++; console.log('  ✗ page errors: ' + errors.join(' | ')); }
console.log(`hub-checking: ${pass} passed, ${fail} failed`);
ws.close(); proc.kill(); try { rmSync(prof, { recursive: true, force: true }); } catch {}
process.exit(fail ? 1 : 0);
