#!/usr/bin/env node
/* ============================================================
   tools/teacher-pupils.mjs — Set homework for some pupils of a class, on any class row (10 Oct 2026).
   (Daniel, 10 Oct 2026: "I am forced to set homework for all of the class. There is no option for me to choose
   individual students … a separated Google Classroom assessment … only for those students selected … update due date
   or remove … should be applied to that more specific homework".)

   The REAL apps-script/Teacher.html, in headless Chrome, with a stand-in for google.script.run. It proves:
   · every class row has "Who: Whole class · Some pupils", Whole class pressed;
   · Some pupils before a class says to choose the class first; with a class, its pupils are listed to tick, with a count;
   · ticking says how many in place and the button names them ("Set for 2 pupils in 11C"); Tick all and None; the button
     waits for a tick; a new class clears the ticks;
   · a second row can be another class, whole ("Set for 2 pupils in 11C and 11D");
   · Set sends each row once: some pupils as { cls: '', emails: [the ticked] } (the labs script posts that in Google
     Classroom to them alone), a whole class as { cls, emails: [] };
   · the topics are asked for the row's class;
   · the list says "2 chosen pupils in 11C" and, opened, that it is theirs only (its own Classroom assignment; Change the
     due date, Hide and Remove act on it only), with Change the due date and Remove;
   · Set again on it refills Some pupils of 11C with the same pupils ticked;
   · a phone: nothing wider than the screen; no script error.
   usage: node tools/teacher-pupils.mjs [--file <a Teacher.html>] [--shots <folder>]
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

const P = (name, cls, email) => ({ name, cls, email });
const STUDENTS = [P('Ria Ham', '11C', 'rue@pupils.x.kr'), P('Ann Cho', '11C', 'ann@pupils.x.kr'), P('Bo Kim', '11C', 'bo@pupils.x.kr'),
  P('Ivy Kwon', '11D', 'ivy@pupils.x.kr'), P('Jun Park', '11D', 'jun@pupils.x.kr')];
const hw = (id, title, extra) => Object.assign({ id, title, who: '11C', what: 'Digestion: The mouth', teacher: 'teacher@x.kr', mine: true,
  pupils: [{ name: 'Ria Ham', cls: '11C', done: 3, total: 8, pct: 37, state: 'partly', last: null }], tally: { done: 0, partly: 1, none: 0 }, setCount: 1, gone: 0,
  created: '2026-10-01T00:00:00.000Z', due: '2026-10-20T14:59:59.000Z', status: 'set', reported: null, dueText: '20 Oct', overdue: false, soon: false, dueBad: false,
  dueDay: '2026-10-20', dueHm: '23:59', inClassroom: true, start: null, startText: '', waiting: false, tasks: [{ labId: 'digestion-lab', stationIds: ['mouth'] }],
  targets: { cls: '11C' }, missing: [], remind: null, outside: [] }, extra || {});
const DATA = { generatedAt: 't', labs: [{ id: 'digestion-lab', name: 'Digestion', topic: '7', questions: 8, stations: [{ id: 'mouth', name: 'The mouth', questions: 8 }] }],
  students: STUDENTS, classes: ['11C', '11D'], whose: 'mine', manifestOk: true, hubSet: true, english: null, writeup: null, classroomOk: true, remindAllowed: null,
  homework: [hw('HW-A', 'Whole class work'),
    hw('HW-P', 'Catch-up for two', { who: '2 students', targets: { emails: ['rue@pupils.x.kr', 'ann@pupils.x.kr'] }, setCount: 2,
      pupils: [{ name: 'Ann Cho', cls: '11C', done: 0, total: 8, pct: 0, state: 'none', last: null }, { name: 'Ria Ham', cls: '11C', done: 8, total: 8, pct: 100, state: 'done', last: null }],
      tally: { done: 1, partly: 0, none: 1 } })] };

const STUB = `<style>*{transition:none!important;animation:none!important}</style><script>
window.__CALLS = [];
try { localStorage.clear(); sessionStorage.clear(); } catch (e) {}
window.google = { script: {} };
Object.defineProperty(window.google.script, 'run', { get: function () {
  var s = null, p = new Proxy({}, { get: function (t, k) {
    if (k === 'withSuccessHandler') return function (f) { s = f; return p; };
    if (k === 'withFailureHandler') return function () { return p; };
    return function (a) { var ok = s; window.__CALLS.push([k, JSON.parse(JSON.stringify(a == null ? null : a))]);
      setTimeout(function () { if (!ok) return;
        if (k === 'uiData') return ok(a === 'homework' ? { ok: true, data: ${JSON.stringify(DATA)} } : { ok: false, why: 'not in this check' });
        if (k === 'homeworkTopics') return ok({ ok: true, topics: ['Unit 7'], courses: 1, byClass: (a.classes || []).map(function (c) { return { cls: c.cls, known: true, topics: ['Unit 7'] }; }) });
        if (k === 'homeworkCreate') return ok({ ok: true, made: ['HW-1', 'HW-2'], posted: ['2 students', '11D'], later: [], notPosted: [], topics: [], topicMissed: [], remind: 'off', data: ${JSON.stringify(DATA)} });
        ok({ ok: false }); }, 30); };
  } });
  return p;
} });
</script>`;

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'teacher-pupils-'));
const page = () => {
  const f = path.join(tmp, 'homework.html');
  fs.writeFileSync(f, fs.readFileSync(FILE, 'utf8')
    .replace('__BOOT__', () => JSON.stringify({ email: 'teacher@x.kr', tab: 'homework', analysis: '', hub: '' }))
    .replace(/<head>/i, (m) => m + STUB));
  return 'file://' + f;
};
const port = 9200 + (process.pid % 90);
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
  const r = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
  fs.writeFileSync(path.join(SHOTS, name + '.png'), Buffer.from(r.data, 'base64'));
}
async function until(fn, a, ms = 6000) { for (let t = 0; t < ms; t += 50) { if (await ev(fn, a).catch(() => false)) return true; await wait(50); } return false; }
const press = (sel) => ev((s) => { const b = document.querySelector(s); if (b) b.click(); return !!b; }, sel);
const choose = (id, v) => ev((a) => { const c = document.getElementById(a[0]); c.value = a[1]; c.dispatchEvent(new Event('change', { bubbles: true })); }, [id, v]);
const type = (id, v) => ev((a) => { const c = document.getElementById(a[0]); c.value = a[1]; c.dispatchEvent(new Event('input', { bubbles: true })); }, [id, v]);
const tick = (row, email, on = true) => ev((a) => { const c = document.querySelector('[data-rpup="' + a[0] + '|' + a[1] + '"]'); if (!c) return false;
  if (c.checked !== a[2]) c.click(); return true; }, [row, email, on]);
const row = (i) => ev((k) => ({
  who: [...document.querySelectorAll('[data-who^="' + k + '|"]')].map((b) => b.textContent + ':' + b.getAttribute('aria-pressed')),
  box: ((document.querySelector('[data-who="' + k + '|all"]') || { closest: () => null }).closest('.bar2') || { textContent: '' }).textContent.replace(/\s+/g, ' '),
  pups: [...document.querySelectorAll('[data-rpup^="' + k + '|"]')].map((c) => c.getAttribute('data-rpup').split('|')[1] + (c.checked ? '+' : '-')),
  count: (document.getElementById('hpc' + k) || {}).textContent || '' }), i);
const setBtn = () => ev(() => { const b = document.getElementById('hset'); return { text: b.textContent, off: b.disabled }; });

try {
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: page() });
  check('Set homework draws', await until(() => document.querySelectorAll('.hw__h').length === 2), 'no homework list');
  let r0 = await row(0);
  check('the class row has "Who: Whole class · Some pupils", Whole class pressed', JSON.stringify(r0.who) === JSON.stringify(['Whole class:true', 'Some pupils:false']), JSON.stringify(r0.who));
  await press('[data-who="0|some"]');
  r0 = await row(0);
  check('Some pupils before a class: it says to choose the class first', /Choose the class first/.test(r0.box) && r0.who[1] === 'Some pupils:true', r0.box);
  await choose('hc0', '11C');
  r0 = await row(0);
  check('with 11C chosen, its three pupils are listed to tick, none ticked, and counted', JSON.stringify(r0.pups) === JSON.stringify(['rue@pupils.x.kr-', 'ann@pupils.x.kr-', 'bo@pupils.x.kr-']) && r0.count === '0 of 3 ticked', JSON.stringify(r0));
  check('it says what a homework for some pupils is', /Only the pupils ticked get it/.test(r0.box) && /posted to them alone/.test(r0.box) && /Change the due date and Remove are for them only/.test(r0.box), r0.box);
  await type('ht', 'Catch-up');
  await type('hd0', '2026-10-30');
  await press('.lab__h[data-lab="digestion-lab"]');
  await ev(() => { const b = document.querySelector('[data-pick="digestion-lab|mouth"]'); b.click(); });
  check('no pupil ticked: Set waits', (await setBtn()).off, JSON.stringify(await setBtn()));
  await tick(0, 'rue@pupils.x.kr'); await tick(0, 'ann@pupils.x.kr');
  r0 = await row(0); let b = await setBtn();
  check('two ticked: the count says so, and the button names them', r0.count === '2 of 3 ticked' && b.text === 'Set for 2 pupils in 11C' && !b.off, JSON.stringify([r0.count, b]));
  check('and the hint counts them', /for 2 students/.test(await ev(() => document.getElementById('hhint').textContent)), await ev(() => document.getElementById('hhint').textContent));
  await press('[data-rall="0"]');
  r0 = await row(0);
  check('Tick all ticks the class', r0.count === '3 of 3 ticked' && r0.pups.every((p) => p.endsWith('+')), JSON.stringify(r0));
  await press('[data-rnone="0"]');
  r0 = await row(0); b = await setBtn();
  check('None clears them, and Set waits again', r0.count === '0 of 3 ticked' && r0.pups.every((p) => p.endsWith('-')) && b.off, JSON.stringify([r0, b]));
  await tick(0, 'rue@pupils.x.kr'); await tick(0, 'ann@pupils.x.kr');
  /* the topic box asks for the row's class (the chosen pupils are in its course) */
  await ev(() => document.getElementById('htopic').dispatchEvent(new Event('focus')));
  const tq = await ev(() => window.__CALLS.filter((c) => c[0] === 'homeworkTopics').map((c) => c[1]));
  check('the Classroom topics are asked for the class', tq.length === 1 && tq[0].classes.length === 1 && tq[0].classes[0].cls === '11C', JSON.stringify(tq));
  await shot('1-some-pupils');
  /* a second row: 11D, the whole class */
  await press('#addrow');
  let r1 = await row(1);
  check('a new row starts as Whole class, and the first keeps its ticks', r1.who[0] === 'Whole class:true' && JSON.stringify((await row(0)).pups) === JSON.stringify(['rue@pupils.x.kr+', 'ann@pupils.x.kr+', 'bo@pupils.x.kr-']), JSON.stringify([r1.who, (await row(0)).pups]));
  await choose('hc1', '11D'); await type('hd1', '2026-10-31');
  b = await setBtn();
  check('the button names both: "Set for 2 pupils in 11C and 11D"', b.text === 'Set for 2 pupils in 11C and 11D' && !b.off, JSON.stringify(b));
  /* a new class on a row of some pupils clears its ticks */
  await press('[data-who="1|some"]'); await tick(1, 'ivy@pupils.x.kr');
  await choose('hc1', '11C');
  r1 = await row(1);
  check('choosing another class clears the row’s ticks', r1.count === '0 of 3 ticked', JSON.stringify(r1));
  await choose('hc1', '11D'); await press('[data-who="1|all"]');
  await press('#hset');
  check('Set is sent once', await until(() => window.__CALLS.filter((c) => c[0] === 'homeworkCreate').length === 1) &&
    (await ev(() => window.__CALLS.filter((c) => c[0] === 'homeworkCreate').length)) === 1, 'not sent, or sent twice');
  const sent = await ev(() => window.__CALLS.filter((c) => c[0] === 'homeworkCreate')[0][1]);
  const c0 = sent.classes[0], c1 = sent.classes[1];
  check('some pupils go as { cls: "", emails: the ticked } (posted in Classroom to them alone); a whole class as { cls, emails: [] }',
    sent.classes.length === 2 && c0.cls === '' && JSON.stringify(c0.emails) === JSON.stringify(['rue@pupils.x.kr', 'ann@pupils.x.kr']) && c0.due === '2026-10-30' &&
    c1.cls === '11D' && JSON.stringify(c1.emails) === '[]' && c1.due === '2026-10-31' && sent.post === true && sent.title === 'Catch-up', JSON.stringify(sent));
  await until(() => /^Set for/.test(document.getElementById('hmsg').textContent));
  const rs = await ev(() => ({ rows: document.querySelectorAll('[data-cls]').length, who: [...document.querySelectorAll('[data-who^="0|"]')].map((x) => x.getAttribute('aria-pressed')),
    msg: document.getElementById('hmsg').textContent }));
  check('after Set: one row again, Whole class, and it says it was set', rs.rows === 1 && JSON.stringify(rs.who) === '["true","false"]' && /^Set for 2 classes\./.test(rs.msg), JSON.stringify(rs));
  /* the list */
  const head = await ev(() => document.querySelector('.hw__h[data-hw="HW-P"]').textContent.replace(/\s+/g, ' '));
  check('the list says "2 chosen pupils in 11C"; a class homework still says its class', /2 chosen pupils in 11C · Digestion/.test(head) &&
    /11C · Digestion/.test(await ev(() => document.querySelector('.hw__h[data-hw="HW-A"]').textContent)), head);
  await press('.hw__h[data-hw="HW-P"]');
  const body = await ev(() => document.querySelector('.hw__h[data-hw="HW-P"]').closest('.hw').textContent.replace(/\s+/g, ' '));
  check('opened, it says it is theirs only, its own Classroom assignment, and what its buttons act on; Change the due date and Remove are there',
    /👤 Set for these pupils only: in Google Classroom it is an assignment of its own, posted to them alone\. Change the due date, Hide and Remove act on this homework only\./.test(body) &&
    !!(await ev(() => document.querySelector('[data-duechg="HW-P"]') && document.querySelector('[data-ask="HW-P"]'))), body.slice(0, 400));
  await press('.hw__h[data-hw="HW-A"]');
  check('a class homework does not say so', !/👤/.test(await ev(() => document.querySelector('.hw__h[data-hw="HW-A"]').closest('.hw').textContent)), 'it does');
  await press('[data-again="HW-P"]');
  r0 = await row(0);
  const sel = await ev(() => document.getElementById('hc0').value);
  check('Set again on it: Some pupils of 11C, the same two ticked', sel === '11C' && r0.who[1] === 'Some pupils:true' &&
    JSON.stringify(r0.pups) === JSON.stringify(['rue@pupils.x.kr+', 'ann@pupils.x.kr+', 'bo@pupils.x.kr-']) && (await ev(() => document.getElementById('ht').value)) === 'Catch-up for two', JSON.stringify([sel, r0]));
  await send('Emulation.setDeviceMetricsOverride', { width: 375, height: 812, deviceScaleFactor: 1, mobile: true });
  await wait(200);
  const w = await ev(() => ({ sw: document.documentElement.scrollWidth, iw: innerWidth }));
  await shot('2-phone');
  check('a phone: the pupils to tick fit, nothing wider than the screen', w.sw <= w.iw, JSON.stringify(w));
  check('no script error', !errors.length, errors.slice(0, 3).join(' | '));
} finally {
  ws.close(); chrome.kill();
  try { fs.rmSync(tmp, { recursive: true, force: true }); } catch {}
}
console.log(`\n${passes} passed, ${fails} failed`);
process.exit(fails ? 1 : 0);
