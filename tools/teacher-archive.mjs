#!/usr/bin/env node
/* ============================================================
   tools/teacher-archive.mjs — the Archive of Set homework (7 Oct 2026).
   (Daniel, 7 Oct 2026: "instead of deleting everything, kind of have a archived section where you have assessments that are
   already, uh, the due date is over"; "deleting a homework should just hide it, not remove it from everywhere else";
   "remove before the due date and hide after the due date"; "make sure that the hover tip explains what removing does and
   that it's going to affect the homework habits … hiding is the one that should be used and only remove when you have
   incorrectly set homework"; "if you only made a mistake about the due date … you can just change the due date".)

   The REAL apps-script/Teacher.html, in headless Chrome, with a stand-in for google.script.run: uiData('homework') answers
   one homework still to come and three past their due date (one of them hidden); homeworkHide and homeworkDelete answer as
   the labs script would. It proves:
   · homework past its due date is not in the list: it is in the Archive below it, folded, which says how many it holds;
   · Open lists them, the most recent first; the hidden one only once "Show the 1 hidden" is pressed;
   · homework still to come has Remove but no Hide; Remove's tip (the real bubble, on hover) says it leaves ⏱️ Homework
     habits, is for homework set by mistake, and that a wrong date only needs “Change the due date”;
   · past its due date: Hide, whose tip says it still counts in ⏱️ Homework habits; Remove, whose tip says to press Hide;
   · waiting for a yes, Remove says the same in words on the card (a tip never shows on a touch screen); Keep it closes it;
   · Hide sends { id, hide: true } once, the card moves to the hidden homework, and the Archive says it still counts;
     Show it again sends { id, hide: false } once and lists it again; a refusal is said in red;
   · a phone: nothing wider than the screen; no script error.
   usage: node tools/teacher-archive.mjs [--file <a Teacher.html>] [--shots <folder>]
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

const hw = (id, title, due, dueText, overdue, hidden) => ({ id, title, who: '11C', what: 'Digestion: The mouth', teacher: 'teacher@x.kr', mine: true,
  pupils: [{ name: 'Ria Ham', cls: '11C', done: 3, total: 8, pct: 37, state: 'partly', last: null }], tally: { done: 0, partly: 1, none: 0 }, setCount: 1, gone: 0,
  created: '2026-09-20T00:00:00.000Z', due, status: 'set', reported: null, dueText, overdue, soon: false, dueBad: false,
  dueDay: due.slice(0, 10), dueHm: '23:59', inClassroom: true, start: null, startText: '', waiting: false, tasks: [{ labId: 'digestion-lab', stationIds: ['mouth'] }],
  targets: { cls: '11C' }, missing: [], remind: null, outside: [], hidden: !!hidden, hiddenText: hidden ? '5 Oct, 10:00' : '' });
const DATA = { generatedAt: 't', labs: [{ id: 'digestion-lab', name: 'Digestion', topic: '7', questions: 8, stations: [{ id: 'mouth', name: 'The mouth', questions: 8 }] }],
  students: [{ name: 'Ria Ham', cls: '11C', email: 'rue@pupils.x.kr' }], classes: ['11C'], whose: 'mine', manifestOk: true, hubSet: true, english: null, writeup: null,
  classroomOk: true, remindAllowed: null,
  homework: [hw('HW-NOW', 'Still to come', '2026-10-20T14:59:59.000Z', '20 Oct', false),
             hw('HW-P1', 'Past one', '2026-10-05T14:59:59.000Z', '5 Oct', true),
             hw('HW-P2', 'Past two', '2026-09-28T14:59:59.000Z', '28 Sep', true),
             hw('HW-H', 'Hidden one', '2026-09-25T14:59:59.000Z', '25 Sep', true, true)] };

const STUB = `<style>*{transition:none!important;animation:none!important}</style><script>
window.__DATA = ${JSON.stringify(DATA)};
window.__HID = []; window.__DEL = []; window.__REFUSE = '';
window.google = { script: {} };
Object.defineProperty(window.google.script, 'run', { get: function () {
  var s = null, p = new Proxy({}, { get: function (t, k) {
    if (k === 'withSuccessHandler') return function (f) { s = f; return p; };
    if (k === 'withFailureHandler') return function () { return p; };
    return function (a) { var ok = s;
      if (k === 'homeworkHide') window.__HID.push(a);
      if (k === 'homeworkDelete') window.__DEL.push(a);
      setTimeout(function () { if (!ok) return;
        if (k === 'uiData') return ok(a === 'homework' ? { ok: true, data: window.__DATA } : { ok: false, why: 'not in this check' });
        if (k === 'homeworkHide') {
          if (window.__REFUSE) return ok({ ok: false, why: window.__REFUSE });
          var d = JSON.parse(JSON.stringify(window.__DATA));
          d.homework.forEach(function (h) { if (h.id === a.id) { h.hidden = !!a.hide; h.hiddenText = a.hide ? '7 Oct, 13:00' : ''; } });
          window.__DATA = d;
          return ok({ ok: true, data: d });
        }
        if (k === 'homeworkDelete') {
          var d2 = JSON.parse(JSON.stringify(window.__DATA));
          d2.homework = d2.homework.filter(function (h) { return h.id !== a; });
          window.__DATA = d2;
          return ok({ ok: true, note: '', data: d2 });
        }
        ok({ ok: false }); }, 40); };
  } });
  return p;
} });
</script>`;

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'teacher-archive-'));
const page = (tab = 'homework') => {
  const f = path.join(tmp, tab + '.html');
  fs.writeFileSync(f, fs.readFileSync(FILE, 'utf8')
    .replace('__BOOT__', () => JSON.stringify({ email: 'teacher@x.kr', tab, analysis: '', hub: '' }))
    .replace(/<head>/i, (m) => m + STUB));
  return 'file://' + f;
};
const port = 9700 + (process.pid % 90);
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
async function until(fn, a, ms = 6000) { for (let t = 0; t < ms; t += 100) { if (await ev(fn, a).catch(() => false)) return true; await wait(100); } return false; }
/* the homework ids in the list, and in the Archive, in the order drawn */
const ids = () => ev(() => {
  const arch = document.getElementById('harch');
  const all = [...document.querySelectorAll('.hw__h')].map((h) => ({ id: h.getAttribute('data-hw'), inArch: !!(arch && arch.contains(h)) }));
  return { list: all.filter((x) => !x.inArch).map((x) => x.id).join(' '), arch: all.filter((x) => x.inArch).map((x) => x.id).join(' '),
           head: arch ? arch.querySelector('.sec__h').textContent.replace(/\s+/g, ' ').trim() : '' };
});
const open = (id) => ev((i) => { const h = document.querySelector('.hw__h[data-hw="' + i + '"]'); if (h && h.getAttribute('aria-expanded') !== 'true') h.click(); return !!h; }, id);
const press = (sel) => ev((s) => { const b = document.querySelector(s); if (b) b.click(); return !!b; }, sel);
/* the real hover: the pointer over the button, then the bubble's words (the page shows it after 120 ms) */
async function tipOf(sel) {
  const at = await ev((s) => { const b = document.querySelector(s); if (!b) return null; b.scrollIntoView({ block: 'center' }); const r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, sel);
  if (!at) return '(no button ' + sel + ')';
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 1, y: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: at.x, y: at.y });
  await until(() => { const t = document.getElementById('tip'); return !!(t && !t.hidden && t.textContent); });
  return ev(() => { const t = document.getElementById('tip'); return t && !t.hidden ? t.textContent : ''; });
}

try {
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: page() });
  check('the homework list draws', await until(() => document.querySelectorAll('.hw__h').length >= 1), 'nothing after 6 s');
  let s = await ids();
  check('the list holds only the homework still to come; the Archive is folded, and says how many it holds',
    s.list === 'HW-NOW' && s.arch === '' && /Archive/.test(s.head) && /2 past their due date · 1 hidden/.test(s.head) && /Open/.test(s.head), JSON.stringify(s));
  const d = await ev(() => document.querySelector('#harch .sec__d').textContent);
  check('the Archive says that all of it still counts in ⏱️ Homework habits, and what Hide does', /still counts in ⏱️ Homework habits/.test(d) && /“Hide” takes one off this list without deleting anything/.test(d), d);
  await shot('1-folded');

  await open('HW-NOW');
  await until(() => !!document.querySelector('[data-ask="HW-NOW"]'));
  check('homework still to come has Remove and “Change the due date”, never Hide',
    await ev(() => !!document.querySelector('[data-ask="HW-NOW"]') && !!document.querySelector('[data-duechg="HW-NOW"]') && !document.querySelector('[data-hide="HW-NOW"]')), 'see the card');
  let t = await tipOf('[data-ask="HW-NOW"]');
  check('its Remove tip says it leaves ⏱️ Homework habits, is for homework set by mistake, and that a wrong date only needs “Change the due date”',
    /cannot be undone/.test(t) && /leaves ⏱️ Homework habits and every student’s record/.test(t) && /only for homework set by mistake/.test(t) && /“Change the due date” instead/.test(t), t);
  await press('[data-ask="HW-NOW"]');
  t = await ev(() => { const c = document.querySelector('.hw__h[data-hw="HW-NOW"]').closest('.hw'); return c.textContent; });
  check('waiting for a yes, the card says the same in words (a tip never shows on a touch screen)',
    /Yes, remove it/.test(t) && /Remove deletes it, and it cannot be undone/.test(t) && /Homework habits/.test(t) && /“Keep it”, then “Change the due date”/.test(t), t.slice(0, 400));
  await press('[data-keep]');
  check('“Keep it” closes it, and nothing was sent', await until(() => !document.querySelector('[data-del]')) && (await ev(() => window.__DEL.length)) === 0, 'still asking');

  await press('[data-arch]');
  s = await ids();
  check('Open lists the homework past its due date, the most recent first; the hidden one waits behind its own button',
    s.list === 'HW-NOW' && s.arch === 'HW-P1 HW-P2' && /Close/.test(s.head) && await ev(() => /Show the 1 hidden/.test((document.querySelector('[data-hidopen]') || {}).textContent || '')), JSON.stringify(s));
  await open('HW-P1');
  await until(() => !!document.querySelector('[data-hide="HW-P1"]'));
  t = await tipOf('[data-hide="HW-P1"]');
  check('past its due date: Hide, whose tip says nothing is deleted and it still counts in ⏱️ Homework habits',
    /Takes it off this list/.test(t) && /Nothing is deleted/.test(t) && /still counts in ⏱️ Homework habits/.test(t), t);
  t = await tipOf('[data-ask="HW-P1"]');
  check('…and Remove, whose tip says it leaves ⏱️ Homework habits and to press “Hide” to keep the record',
    /leaves ⏱️ Homework habits/.test(t) && /set by mistake/.test(t) && /press “Hide”/.test(t), t);
  await press('[data-ask="HW-P1"]');
  t = await ev(() => document.querySelector('.hw__h[data-hw="HW-P1"]').closest('.hw').textContent);
  check('waiting for a yes on archived homework, the card points to Hide', /“Keep it”, then “Hide”/.test(t), t.slice(0, 400));
  await press('[data-keep]');
  await shot('2-archive-open');

  await press('[data-hide="HW-P1"]');
  check('Hide sends { id, hide: true } once; the card leaves the Archive; the Archive says it is hidden and still counts',
    await until(() => /is hidden\. It still counts in ⏱️ Homework habits/.test((document.querySelector('#harch .msg.ok') || {}).textContent || '')) &&
    JSON.stringify(await ev(() => window.__HID)) === JSON.stringify([{ id: 'HW-P1', hide: true }]) && (await ids()).arch === 'HW-P2' &&
    /1 past its due date · 2 hidden/.test((await ids()).head), JSON.stringify([await ev(() => window.__HID), await ids()]));
  await press('[data-hidopen]');
  s = await ids();
  check('“Show the 2 hidden” lists them under the rest, sorted as the rest are', s.arch === 'HW-P2 HW-P1 HW-H', JSON.stringify(s));
  await open('HW-H');
  await until(() => !!document.querySelector('[data-unhide="HW-H"]'));
  check('hidden homework has “Show it again” and Remove, but no Hide and no new due date',
    await ev(() => !!document.querySelector('[data-unhide="HW-H"]') && !!document.querySelector('[data-ask="HW-H"]') && !document.querySelector('[data-hide="HW-H"]') && !document.querySelector('[data-duechg="HW-H"]')), 'see the card');
  await press('[data-unhide="HW-H"]');
  check('Show it again sends { id, hide: false } once, and it is listed in the Archive again',
    await until(() => /“Hidden one” is listed in the Archive again/.test((document.querySelector('#harch .msg.ok') || {}).textContent || '')) &&
    JSON.stringify(await ev(() => window.__HID.slice(1))) === JSON.stringify([{ id: 'HW-H', hide: false }]) && (await ids()).arch.split(' ')[0] === 'HW-P2', JSON.stringify(await ids()));
  await ev(() => { window.__REFUSE = 'Somebody else is changing the homework just now — try again in a moment.'; });
  await open('HW-P2');
  await until(() => !!document.querySelector('[data-hide="HW-P2"]'));
  await press('[data-hide="HW-P2"]');
  check('a refusal is said in red at the top of the Archive, and the homework stays where it was',
    await until(() => /try again in a moment/.test((document.querySelector('#harch .msg.bad') || {}).textContent || '')) && /HW-P2/.test((await ids()).arch), JSON.stringify(await ids()));
  await ev(() => { window.__REFUSE = ''; });
  await shot('3-hidden');

  await send('Emulation.setDeviceMetricsOverride', { width: 375, height: 812, deviceScaleFactor: 1, mobile: true });
  await wait(300);
  const w = await ev(() => ({ sw: document.documentElement.scrollWidth, iw: innerWidth, open: !!document.querySelector('#harch .hw') }));
  await shot('4-phone');
  check('a phone: the Archive open, nothing wider than the screen', w.open && w.sw <= w.iw, JSON.stringify(w));
  check('no script error', !errors.length, errors.slice(0, 3).join(' | '));
} finally {
  ws.close(); chrome.kill();
  try { fs.rmSync(tmp, { recursive: true, force: true }); } catch {}
}
console.log(`\n${passes} passed, ${fails} failed`);
process.exit(fails ? 1 : 0);
