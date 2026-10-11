#!/usr/bin/env node
/* ============================================================
   tools/teacher-speed.mjs — the teacher page reads every view at once and keeps each one on the computer (10 Oct 2026).
   (Daniel, 10 Oct 2026: "you load every tab individually … why don't you basically load all of them at the same time,
   store them in local storage, so that when you navigate between tabs, they are all loaded".)

   The REAL apps-script/Teacher.html, in headless Chrome, with a stand-in for google.script.run whose every answer comes
   after a delay and is a little newer each time (the first homework is called "Gut practice v1", then v2…). It proves:
   · opening the page asks for all eight views at once, before any answer has come; a tab clicked once its view has come
     is drawn at once, with no new read;
   · each view is kept in localStorage under the teacher's address; opened again, the page draws the kept copy at once
     ("read … · updating"), reads every view again at the same time, and draws the new copy over it;
   · a teacher who has clicked or typed in the view is not interrupted: "Show the newer copy" waits for them, what they
     typed stays, and the button draws the new copy;
   · homework set while a read is in the air stays on the list when that older read comes back;
   · Refresh keeps the view on the screen (dimmed, never "Loading"), reads every view again, then draws the new copy;
   · another teacher on the same computer never sees the first one's copy; a copy older than a week is never drawn and
     is dropped (another teacher's too);
   · each view comes back where the teacher left it on the page;
   · back on the page after ten minutes away, the views are read again, once;
   · a kept copy in a shape the page cannot draw (from before a paste) waits for the new one;
   · no script error.
   usage: node tools/teacher-speed.mjs [--file <a Teacher.html>] [--shots <folder>]
   ============================================================ */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (n) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : ''; };
const FILE = arg('--file') || path.join(ROOT, 'apps-script/Teacher.html');
const SHOTS = arg('--shots');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const VIEWS = ['teachers', 'progress', 'english', 'writeup', 'practicals', 'students', 'homework', 'habits'];   // 🔬 Practicals since 11 Oct 2026 (BA)

const hw = (id, title, extra) => Object.assign({ id, title, who: '11C', what: 'Digestion: The mouth', teacher: 'teacher@x.kr', mine: true,
  pupils: [{ name: 'Ria Ham', cls: '11C', done: 3, total: 8, pct: 37, state: 'partly', last: null }], tally: { done: 0, partly: 1, none: 0 }, setCount: 1, gone: 0,
  created: '2026-10-01T00:00:00.000Z', due: '2026-10-20T14:59:59.000Z', status: 'set', reported: null, dueText: '20 Oct', overdue: false, soon: false, dueBad: false,
  dueDay: '2026-10-20', dueHm: '23:59', inClassroom: true, start: null, startText: '', waiting: false, tasks: [{ labId: 'digestion-lab', stationIds: ['mouth'] }],
  targets: { cls: '11C' }, missing: [], remind: null, outside: [] }, extra || {});
/* many homework, so the Set homework view is taller than the window (where the teacher was on the page is kept) */
const BASE = { generatedAt: 't', labs: [{ id: 'digestion-lab', name: 'Digestion', topic: '7', questions: 8, stations: [{ id: 'mouth', name: 'The mouth', questions: 8 }] }],
  students: [{ name: 'Ria Ham', cls: '11C', email: 'rue@pupils.x.kr' }], classes: ['11C'], whose: 'mine', manifestOk: true, hubSet: true, english: null, writeup: null,
  classroomOk: false, remindAllowed: null,
  homework: Array.from({ length: 14 }, (_, i) => hw('HW-' + (i + 2), 'Other homework ' + (i + 2), { due: '2026-10-' + (21 + (i % 8)) + 'T14:59:59.000Z', dueText: (21 + (i % 8)) + ' Oct' })) };
const DIR = { students: [{ name: 'Ria Ham', cls: '11C', email: 'rue@pupils.x.kr', cohort: { grad: 2027, title: 'Class of 2027', yearGroup: 'Y11' } }], classes: ['11C'] };

const STUB = `<style>*{transition:none!important;animation:none!important}</style><script>
window.__CALLS = []; window.__ANS = []; window.__SET = [];
var __q = location.search, __d = /delay=(\\d+)/.exec(__q);
window.__DELAY = __d ? +__d[1] : 300;
/* the generation lives on the computer, so each opening of the page is answered with a newer copy than the last */
function __gen(){ var g = +(localStorage.getItem('test.gen') || 0) + 1; localStorage.setItem('test.gen', String(g)); return g; }
function __hw(g){ var d = JSON.parse(JSON.stringify(${JSON.stringify(BASE)}));
  d.homework.unshift(${JSON.stringify(hw('HW-1', 'Gut practice'))}); d.homework[0].title = 'Gut practice v' + g;
  if (window.__FRESH) d.homework.unshift(window.__FRESH);
  return d; }
window.google = { script: {} };
Object.defineProperty(window.google.script, 'run', { get: function () {
  var s = null, p = new Proxy({}, { get: function (t, k) {
    if (k === 'withSuccessHandler') return function (f) { s = f; return p; };
    if (k === 'withFailureHandler') return function () { return p; };
    return function (a) { var ok = s, at = performance.now();
      window.__CALLS.push([k, a, Math.round(at)]);
      if (k === 'uiData') {
        var g = a === 'homework' ? __gen() : 0;    /* the copy is made when the read STARTS, as the sheet would be read */
        var ans = a === 'homework' ? { ok: true, data: __hw(g) } : a === 'students' ? { ok: true, data: ${JSON.stringify(DIR)}, trackerBase: '' } : { ok: false, why: 'not in this check' };
        return setTimeout(function () { window.__ANS.push([a, Math.round(performance.now())]); ok && ok(ans); }, window.__DELAY);
      }
      if (k === 'homeworkCreate') { window.__SET.push(a);
        return setTimeout(function () {
          window.__FRESH = ${JSON.stringify(hw('HW-NEW', 'Fresh one'))};
          ok && ok({ ok: true, made: ['HW-NEW'], posted: [], later: [], notPosted: [], topics: [], topicMissed: [], remind: 'off', data: __hw(99) }); }, 50); }
      setTimeout(function () { ok && ok({ ok: false }); }, 40); };
  } });
  return p;
} });
</script>`;

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'teacher-speed-'));
const page = (tab = 'homework', email = 'teacher@x.kr') => {
  const f = path.join(tmp, tab + '-' + email.replace(/\W/g, '') + '.html');
  fs.writeFileSync(f, fs.readFileSync(FILE, 'utf8')
    .replace('__BOOT__', () => JSON.stringify({ email, tab, analysis: '', hub: '' }))
    .replace(/<head>/i, (m) => m + STUB));
  return 'file://' + f;
};
const port = 9300 + (process.pid % 90);
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${path.join(tmp, 'prof')}`, '--no-first-run',
  '--no-default-browser-check', '--disable-gpu', '--hide-scrollbars', '--window-size=1440,900', 'about:blank'], { stdio: 'ignore' });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let list = null;
for (let i = 0; i < 150 && !(list && list.length); i++) { try { list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); } catch {} await wait(100); }
const ws = new WebSocket(list.find((t) => t.type === 'page').webSocketDebuggerUrl);
await new Promise((ok, no) => { ws.onopen = ok; ws.onerror = no; });
let n = 0; const waiting = new Map(); const errors = [];
const send = (method, params = {}) => new Promise((ok, no) => { const id = ++n; waiting.set(id, [ok, no]); ws.send(JSON.stringify({ id, method, params })); });
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.id && waiting.has(m.id)) { const [ok, no] = waiting.get(m.id); waiting.delete(m.id); return m.error ? no(new Error(m.error.message)) : ok(m.result); }
  if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
  if (m.method === 'Fetch.requestPaused') send('Fetch.fulfillRequest', { requestId: m.params.requestId, responseCode: 200, body: '', responseHeaders: [{ name: 'Content-Type', value: 'text/css' }] }).catch(() => {});
};
await send('Page.enable'); await send('Runtime.enable');
await send('Fetch.enable', { patterns: [{ urlPattern: '*fonts.googleapis.com/*' }, { urlPattern: '*fonts.gstatic.com/*' }] });
async function ev(fn, a) {
  const r = await send('Runtime.evaluate', { expression: `(${fn.toString()})(${JSON.stringify(a ?? null)})`, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || 'evaluate failed');
  return r.result.value;
}
let fails = 0, passes = 0;
function check(label, okay, why) { if (okay) { passes++; console.log('  ok   ' + label); } else { fails++; console.log('  FAIL ' + label + '  →  ' + why); } }
async function shot(name) {
  if (!SHOTS) return;
  fs.mkdirSync(SHOTS, { recursive: true });
  const r = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(SHOTS, name + '.png'), Buffer.from(r.data, 'base64'));
}
async function until(fn, a, ms = 6000) { for (let t = 0; t < ms; t += 25) { if (await ev(fn, a).catch(() => false)) return true; await wait(25); } return false; }
/* navigate and wait until the page has its first drawing (a kept copy, or "Loading") */
async function open(url) { await send('Page.navigate', { url }); return until((u) => location.href === u && document.readyState !== 'loading' && !!window.__CALLS, url); }
const firstTitle = () => ev(() => { const t = document.querySelector('.hw__t'); return t ? t.textContent : ''; });
const titles = () => ev(() => [...document.querySelectorAll('.hw__t')].map((t) => t.textContent));
const age = () => ev(() => document.getElementById('age').textContent);
const reads = () => ev(() => window.__CALLS.filter((c) => c[0] === 'uiData'));
const press = (sel) => ev((s) => { const b = document.querySelector(s); if (b) b.click(); return !!b; }, sel);

try {
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  /* 1. the first opening: nothing kept yet */
  await open(page());
  check('opened with nothing kept: "Loading" until the view comes', /Loading/.test(await ev(() => document.getElementById('view').textContent)), await ev(() => document.getElementById('view').textContent.slice(0, 80)));
  await until((n) => window.__ANS.length >= n, VIEWS.length);   /* the count goes in as the argument: VIEWS is not in the page */
  let r = await reads(), ans = await ev(() => window.__ANS);
  const firstAnswer = Math.min(...ans.map((a) => a[1]));
  check('opening asks for all eight views at once, before any answer has come',
    r.length === VIEWS.length && VIEWS.every((v) => r.some((c) => c[1] === v)) && r.every((c) => c[2] < firstAnswer) && r[0][1] === 'homework',
    JSON.stringify(r) + ' first answer at ' + firstAnswer);
  check('then the view is drawn', (await firstTitle()) === 'Gut practice v1', await firstTitle());
  check('and kept on the computer under the teacher’s address', await ev(() => { try { const o = JSON.parse(localStorage.getItem('teach2.teacher@x.kr.homework')); return !!(o && o.at && o.r && o.r.ok); } catch (e) { return false; } }), 'no teach2.teacher@x.kr.homework');
  const before = (await reads()).length;
  await press('#tab-students');
  const sw = await ev(() => ({ cards: document.querySelectorAll('.card').length, load: /Loading/.test(document.getElementById('view').textContent) }));
  check('a tab whose view has come is drawn at once, with no new read', sw.cards > 0 && !sw.load && (await reads()).length === before, JSON.stringify(sw));
  await press('#tab-homework');
  check('and back again, also at once', (await firstTitle()) === 'Gut practice v1' && (await reads()).length === before, await firstTitle());

  /* 2. opened again: the kept copy at once, every view read again, the new copy drawn over it */
  await open(page() + '?delay=600');
  const at0 = await ev(() => ({ t: (document.querySelector('.hw__t') || {}).textContent || '', age: document.getElementById('age').textContent, n: window.__ANS.length }));
  check('opened again: the kept copy is drawn at once, before any answer, and says it is being read again',
    at0.t === 'Gut practice v1' && at0.n === 0 && /^read .* · updating$/.test(at0.age), JSON.stringify(at0));
  r = await reads();
  check('every view is read again, all at the same time', r.length === VIEWS.length && VIEWS.every((v) => r.some((c) => c[1] === v)), JSON.stringify(r));
  await shot('1-kept-copy');
  check('when the new copy comes it is drawn over the old one (the teacher had not touched it)', await until(() => (document.querySelector('.hw__t') || {}).textContent === 'Gut practice v2'), await firstTitle());
  check('and the age says so', /^read just now$/.test(await age()) && await ev(() => document.getElementById('nw').hidden), await age());

  /* 3. a teacher at work is not interrupted */
  await open(page() + '?delay=900');
  await ev(() => { const t = document.getElementById('ht'); t.focus(); t.value = 'My draft'; t.dispatchEvent(new Event('input', { bubbles: true })); });
  await until((n) => window.__ANS.length >= n, VIEWS.length, 4000);
  const busy = await ev(() => ({ t: document.querySelector('.hw__t').textContent, nw: !document.getElementById('nw').hidden, draft: document.getElementById('ht').value, focus: document.activeElement && document.activeElement.id }));
  check('typing in the view: the new copy waits, "Show the newer copy" is offered, and the typing and its place are kept',
    busy.t === 'Gut practice v2' && busy.nw && busy.draft === 'My draft' && busy.focus === 'ht', JSON.stringify(busy));
  await shot('2-newer-copy-waits');
  await press('#nw');
  const shown = await ev(() => ({ t: document.querySelector('.hw__t').textContent, nw: !document.getElementById('nw').hidden, draft: document.getElementById('ht').value }));
  check('"Show the newer copy" draws it, and the title typed is still in its box', shown.t === 'Gut practice v3' && !shown.nw && shown.draft === 'My draft', JSON.stringify(shown));

  /* 4. homework set while a read is in the air */
  await open(page() + '?delay=1500');
  await ev(() => {
    const t = document.getElementById('ht'); t.value = 'Fresh one'; t.dispatchEvent(new Event('input', { bubbles: true }));
    const c = document.getElementById('hc0'); c.value = '11C'; c.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await ev(() => { const d = document.getElementById('hd0'); d.value = '2026-10-30'; d.dispatchEvent(new Event('input', { bubbles: true }));
    document.querySelector('.lab__h[data-lab="digestion-lab"]').click(); });
  await ev(() => { const b = document.querySelector('[data-pick="digestion-lab|mouth"]'); b.checked = true; b.dispatchEvent(new Event('change', { bubbles: true })); });
  await press('#hset');
  check('homework set while every view is still being read: it is on the list at once', await until(() => [...document.querySelectorAll('.hw__t')].some((t) => t.textContent === 'Fresh one'), null, 1000), JSON.stringify(await titles()));
  await until((n) => window.__ANS.length >= n, VIEWS.length, 4000);
  const after = await ev(() => ({ ts: [...document.querySelectorAll('.hw__t')].map((t) => t.textContent), nw: !document.getElementById('nw').hidden,
    kept: JSON.parse(localStorage.getItem('teach2.teacher@x.kr.homework')).r.data.homework.map((h) => h.title) }));
  check('the read that left before it comes back and does not take it away, nor offer an older copy',
    after.ts.includes('Fresh one') && !after.nw && after.kept.includes('Fresh one'), JSON.stringify(after));
  await press('#tab-students'); await press('#tab-homework');
  check('nor does leaving the tab and coming back', (await titles()).includes('Fresh one'), JSON.stringify(await titles()));

  /* 5. Refresh */
  await ev(() => { window.__CALLS.length = 0; window.__ANS.length = 0; window.__DELAY = 500; });
  await press('#rf');
  const rf = await ev(() => ({ stale: document.getElementById('view').classList.contains('stale'), load: /Loading/.test(document.getElementById('view').textContent),
    cards: document.querySelectorAll('.hw__t').length, n: window.__CALLS.filter((c) => c[0] === 'uiData').length, age: document.getElementById('age').textContent }));
  check('Refresh keeps the view on the screen, dimmed, never "Loading", and reads every view again at once',
    rf.stale && !rf.load && rf.cards > 0 && rf.n === VIEWS.length && / · updating$/.test(rf.age), JSON.stringify(rf));
  check('then the new copy is drawn and the view is no longer dimmed',
    await until((n) => !document.getElementById('view').classList.contains('stale') && window.__ANS.length >= n, VIEWS.length), await ev(() => document.getElementById('view').className));

  /* 6. where the teacher was on the page */
  await ev(() => window.scrollTo(0, 400));
  const y0 = await ev(() => window.pageYOffset);
  await press('#tab-students');
  const y1 = await ev(() => window.pageYOffset);
  await press('#tab-homework');
  const y2 = await ev(() => window.pageYOffset);
  check('each view comes back where the teacher left it on the page; a view not scrolled starts at the top', y0 === 400 && y1 === 0 && y2 === 400, JSON.stringify([y0, y1, y2]));

  /* 7. back after ten minutes away: read again, once */
  await ev(() => { window.__CALLS.length = 0; const real = Date.now; Date.now = () => real() + 11 * 60 * 1000;
    document.dispatchEvent(new Event('visibilitychange')); document.dispatchEvent(new Event('visibilitychange')); });
  const back = await reads();
  check('back on the page after ten minutes away: the views kept read again once, together (not twice)', back.length === 2 && back.some((c) => c[1] === 'homework') && back.some((c) => c[1] === 'students'), JSON.stringify(back));

  /* 8. another teacher on the same computer; a copy older than a week */
  await open(page('homework', 'other@x.kr'));
  const other = await ev(() => ({ view: document.getElementById('view').textContent.slice(0, 40), mine: !!localStorage.getItem('teach2.teacher@x.kr.homework') }));
  check('another teacher on the same computer never sees the first one’s copy (it is kept for the first one)', /Loading/.test(other.view) && other.mine, JSON.stringify(other));
  await until((n) => window.__ANS.length >= n, VIEWS.length);   /* the count goes in as the argument: VIEWS is not in the page */
  await ev(() => { const k = 'teach2.teacher@x.kr.homework', o = JSON.parse(localStorage.getItem(k)); o.at = Date.now() - 8 * 864e5; o.r.data.homework[0].title = 'Too old';
    localStorage.setItem(k, JSON.stringify(o)); localStorage.setItem('teach2.gone@x.kr.homework', JSON.stringify({ at: Date.now() - 9 * 864e5, r: { ok: true } })); });
  await open(page());
  const old = await ev(() => ({ view: document.getElementById('view').textContent.slice(0, 40), gone: localStorage.getItem('teach2.gone@x.kr.homework') }));
  check('a copy older than a week is never drawn, and another teacher’s old copy is dropped', /Loading/.test(old.view) && old.gone === null, JSON.stringify(old));
  check('then the view comes, and is kept again', await until(() => /^Gut practice v/.test((document.querySelector('.hw__t') || {}).textContent || '')) &&
    await ev(() => Date.now() - JSON.parse(localStorage.getItem('teach2.teacher@x.kr.homework')).at < 60000), await firstTitle());
  /* 9. a copy kept from before a paste, in a shape the page cannot draw: it waits for the new one */
  await ev(() => { const k = 'teach2.teacher@x.kr.homework'; localStorage.setItem(k, JSON.stringify({ at: Date.now(), r: { ok: true, data: { homework: 'an older shape' } } })); });
  await open(page() + '?delay=400');
  const odd = await ev(() => document.getElementById('view').textContent.slice(0, 40));
  check('a kept copy the page cannot draw (an older shape) waits for the new one, as "Loading"', /Loading/.test(odd), odd);
  check('then the new copy is drawn', await until(() => /^Gut practice v/.test((document.querySelector('.hw__t') || {}).textContent || '')), await firstTitle());
  check('no script error', !errors.length, errors.slice(0, 3).join(' | '));
} finally {
  ws.close(); chrome.kill();
  try { fs.rmSync(tmp, { recursive: true, force: true }); } catch {}
}
console.log(`\n${passes} passed, ${fails} failed`);
process.exit(fails ? 1 : 0);
