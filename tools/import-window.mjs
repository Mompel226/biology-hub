#!/usr/bin/env node
/* ============================================================
   tools/import-window.mjs — the Classroom import window: ONE call starts a job on the server, and the window follows it.
   (Daniel, 6 Oct 2026: importing several classes at once "got stuck", and 11C came in as 8 of 16; the import must
   "handle the six minutes limit well", and the window may be closed while it goes on.)

   The REAL apps-script/ClassroomImport.html, in headless Chrome, with a stand-in for google.script.run that answers as
   the labs script's job would: the first piece's results from executeBatchImportAll, then each record the job publishes,
   one per poll (getBatchImportProgress). No spreadsheet, no Classroom, no sign-in. It proves:
   · ONE call for every ticked class, never one per class; it says the window may be closed;
   · each class shows its result as the record brings it ("N in Classroom", added, already here, moved, no address, also
     in another ticked class), a failed class in Google's words, the next still going;
   · while the job waits a minute it says so (⏸, "carries on by itself"), and keeps following it;
   · at the end: each class's count on the Students tab, the summary, "Try the 1 again" for the failed class, which
     starts a NEW job for that class alone;
   · the first call failing (a stopped piece) is not called a failure: the window follows the job to its end;
   · a record that does not move for 12 minutes: the window says so, and offers Try again;
   · formatting stopped twice: it says every name is in and Tidy up finishes it; nothing new: the tabs left alone;
   · Google refusing the trigger that carries the job on: Stopped at once, with Try again (or Tidy up, every name in);
   · a new school year (7 Oct 2026): the pupils in none of this year's classes, folded when the window opens and open under
     the summary after an import; ticks by class and by pupil; one press sends exactly the ticked ones (markPupilsLeft),
     then the list as it is now; a refusal keeps the ticks; a class code LEFT is refused before Import;
   · the window at its own size (880 × 620): nothing wider than the window; no script error.
   usage: node tools/import-window.mjs [--file <a ClassroomImport.html>] [--shots <folder>]
   ============================================================ */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (n) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : ''; };
const FILE = arg('--file') || path.join(ROOT, 'apps-script/ClassroomImport.html');
const SHOTS = arg('--shots');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const COURSES = [['cA', '11C Biology', '11C'], ['cB', '11D Biology', '11D'], ['cC', '9B Biology', '9B']]
  .map(([id, name, code]) => ({ id, name, section: '', display: name, autoClassCode: code }));
const A = { status: 'success', listed: 16, added: 8, skipped: 8, moved: 0, clashes: [], noEmail: [] };
const B = { status: 'error', error: 'Request failed for https://classroom.googleapis.com returned code 503' };
const C = { status: 'success', listed: 20, added: 0, skipped: 20, moved: 3, clashes: [{ name: 'Rue Ha', was: '11C' }], noEmail: ['Ian Kwon'] };
const P = { status: 'pending' };
/* the pupils in none of this year's classes, as getNotThisYear gives them (7 Oct 2026) */
const G11B = { cls: '11B', total: 4, pupils: [['Bo Han', 'bo.han'], ['Cy Lee', 'cy.lee'], ['Di Park', 'di.park'], ['Ed Yoon', 'ed.yoon']]
  .map(([name, e]) => ({ name, email: e + '@x.kr', why: 'course' })) };
const LIST = { n: 5, imported: 3, since: '1 August 2026', label: 'LEFT 2026', busy: false,
  groups: [{ cls: '10A', total: 24, pupils: [{ name: 'Ann Ko', email: 'ann.ko@x.kr', why: 'gone' }] }, G11B] };
const AFTER = { n: 4, imported: 3, since: '1 August 2026', label: 'LEFT 2026', busy: false, groups: [G11B] };

/* Per scenario: what the first call answers, then the records the polls see, in order (the last one repeats). A job's
   records are keyed by the job id the window made, so "Try again" (a new job) gets its own list. */
const SCENARIOS = {
  main: `{
    first: { 1: [A, B, P], 2: [{ status: 'success', listed: 15, added: 15, skipped: 0, moved: 0, clashes: [], noEmail: [] }] },
    polls: {
      1: [ { results: [A, B, P], done: false, phase: 'Paused for a minute, to stay inside Google’s time limit. It carries on by itself: you can close this window.', continuing: true, ts: 1 },
           { results: [A, B, P], done: false, phase: 'Paused for a minute, to stay inside Google’s time limit. It carries on by itself: you can close this window.', continuing: true, ts: 1 },
           { results: [A, B, C], done: false, phase: 'Names imported. Building and formatting every tab…', ts: 2 },
           { results: [A, B, C], done: true, phase: 'Finished.', ts: 3, counts: { '11C': 15, '9B': 20 } } ],
      2: [ { results: [{ status: 'success', listed: 15, added: 15, skipped: 0, moved: 0, clashes: [], noEmail: [] }], done: true, phase: 'Finished.', ts: 4, counts: { '11C': 15, '11D': 15, '9B': 20 } } ]
    }
  }`,
  firstStops: `{
    first: { fail: 'Exceeded maximum execution time' },
    polls: { 1: [ { results: [A, P, P], done: false, phase: '', ts: 1 },
                  { results: [A, { status: 'success', listed: 5, added: 5, skipped: 0, moved: 0, clashes: [], noEmail: [] }, P], done: false, phase: '', ts: 2 },
                  { results: [A, { status: 'success', listed: 5, added: 5, skipped: 0, moved: 0, clashes: [], noEmail: [] }, { status: 'success', listed: 5, added: 5, skipped: 0, moved: 0, clashes: [], noEmail: [] }], done: true, phase: 'Finished.', ts: 3, counts: { '11C': 16, '11D': 5, '9B': 5 } } ] }
  }`,
  stall: `{
    first: { 1: [A, P, P] },
    polls: { 1: [ { results: [A, P, P], done: false, phase: '', ts: 1 } ] }
  }`,
  formatStopped: `{
    first: { 1: [A, A, A] },
    polls: { 1: [ { results: [A, A, A], done: true, phase: 'Finished.', ts: 1, formatStopped: true, counts: { '11C': 16 } } ] }
  }`,
  nothingNew: `{
    first: { 1: [{ status: 'success', listed: 16, added: 0, skipped: 16, moved: 0, clashes: [], noEmail: [] }] },
    polls: { 1: [ { results: [{ status: 'success', listed: 16, added: 0, skipped: 16, moved: 0, clashes: [], noEmail: [] }], done: true, phase: 'Finished.', ts: 1, counts: { '11C': 16 } } ] }
  }`,
  noTrigger: `{
    first: { 1: [A, P, P] },
    polls: { 1: [ { results: [A, P, P], done: true, phase: 'Stopped.', ts: 1, noTrigger: true, counts: { '11C': 16 } } ] }
  }`,
  noTriggerNamesIn: `{
    first: { 1: [A, A, A] },
    polls: { 1: [ { results: [A, A, A], done: true, phase: 'Stopped.', ts: 1, noTrigger: true, namesIn: true, counts: { '11C': 16 } } ] }
  }`,
  left: `{
    left0: LIST,
    mark: { ok: { ok: true, note: '1 pupil is in LEFT 2026 now. Their records stay. Importing their class again, or Move on the teacher page, puts one back.', left: AFTER } }
  }`,
  leftRefused: `{
    left0: LIST,
    mark: { ok: { ok: false, why: 'An import is still running. Wait until it says Finished, then try again.' } }
  }`,
  leftBusy: `{ left0: Object.assign({}, LIST, { busy: true }) }`,
  leftAfter: `{
    left0: LIST,
    first: { 1: [A] },
    polls: { 1: [ { results: [A], done: true, phase: 'Finished.', ts: 1, counts: { '11C': 16 } } ] },
    left1: AFTER
  }`,
  /* the audit (7 Oct 2026): a second import refused while one runs; an import with a class that failed */
  busyRefused: `{
    first: { 1: [{ status: 'busy', error: 'Another import is still running (it carries on by itself). Try again once it says Finished.' }, P, P] },
    polls: { 1: [ { results: [{ status: 'busy', error: 'Another import is still running (it carries on by itself). Try again once it says Finished.' }, { status: 'busy', error: 'Another import is still running (it carries on by itself). Try again once it says Finished.' }, { status: 'busy', error: 'Another import is still running (it carries on by itself). Try again once it says Finished.' }], done: true, stopped: true, phase: 'Another import is still running. Try again once it says Finished.', ts: 1 } ] }
  }`,
  leftAfterFail: `{
    left0: LIST,
    first: { 1: [A, B] },
    polls: { 1: [ { results: [A, B], done: true, phase: 'Finished.', ts: 1, counts: { '11C': 16 } } ] },
    left1: AFTER
  }`,
  leftWhileImporting: `{
    left0: LIST,
    first: { 1: [A, P] },
    polls: { 1: [ { results: [A, P], done: false, phase: 'Paused for a minute, to stay inside Google’s time limit. It carries on by itself: you can close this window.', continuing: true, ts: 1 } ] }
  }`
};

/* google.script.run: every call recorded, answered after a short wait; the page's clock can be moved on (__shift) */
const stub = (scenario) => `<script>
(function () { var real = Date.now; window.__shift = 0; Date.now = function () { return real() + window.__shift; }; })();
var A = ${JSON.stringify(A)}, B = ${JSON.stringify(B)}, C = ${JSON.stringify(C)}, P = ${JSON.stringify(P)};
var LIST = ${JSON.stringify(LIST)}, AFTER = ${JSON.stringify(AFTER)};
window.__LOG = []; window.__JOBS = {}; window.__POLLN = {};
window.__S = ${SCENARIOS[scenario]};
window.google = { script: { host: { close: function () { window.__closed = true; } } } };
Object.defineProperty(window.google.script, 'run', { get: function () {
  var s = null, f = null, p = new Proxy({}, { get: function (t, k) {
    if (k === 'withSuccessHandler') return function (h) { s = h; return p; };
    if (k === 'withFailureHandler') return function (h) { f = h; return p; };
    return function () {
      var args = Array.prototype.slice.call(arguments), ok = s, no = f, a;
      window.__LOG.push({ fn: k, args: JSON.parse(JSON.stringify(args)) });
      if (k === 'getBatchImportData') a = { ok: { courses: ${JSON.stringify(COURSES)}, have: { '11C': 8 }, left: window.__S.left0 || null } };
      else if (k === 'getNotThisYear') a = { ok: window.__S.left1 || null };
      else if (k === 'markPupilsLeft') a = window.__S.mark;
      else if (k === 'executeBatchImportAll') {
        var n = Object.keys(window.__JOBS).length + 1; window.__JOBS[args[1]] = n;
        var fr = window.__S.first;
        a = fr.fail ? { fail: fr.fail } : { ok: fr[n] };
      } else if (k === 'getBatchImportProgress') {
        var jn = window.__JOBS[args[0]], list = window.__S.polls[jn] || [];
        var i = window.__POLLN[args[0]] = (window.__POLLN[args[0]] || 0) + 1;
        a = { ok: list.length ? list[Math.min(i, list.length) - 1] : null };
      } else a = { fail: 'Script function not found: ' + k };
      setTimeout(function () { if ('fail' in a) { if (no) no({ message: a.fail }); } else if (ok) ok(a.ok); }, 40);
    };
  } });
  return p;
} });
</script>`;

/* ---------- a browser ---------- */
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'import-window-'));
const page = (scenario) => {
  const f = path.join(tmp, scenario + '.html');
  fs.writeFileSync(f, fs.readFileSync(FILE, 'utf8').replace(/<head>/i, (m) => m + stub(scenario)));
  return 'file://' + f;
};
const port = 9800 + (process.pid % 90);
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${path.join(tmp, 'prof')}`, '--no-first-run',
  '--no-default-browser-check', '--disable-gpu', '--hide-scrollbars', '--window-size=880,620', 'about:blank'], { stdio: 'ignore' });
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
};
await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 880, height: 620, deviceScaleFactor: 1, mobile: false });
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
async function until(fn, a, ms = 12000) {
  for (let t = 0; t < ms; t += 100) { if (await ev(fn, a).catch(() => false)) return true; await wait(100); }
  return false;
}
async function open(scenario) {
  await send('Page.navigate', { url: page(scenario) });
  return until(() => document.querySelectorAll('tr.row').length === 3);
}
const tick = (ids) => ev((ids) => {
  ids.forEach((id) => document.getElementById(id).click());
  const b = document.getElementById('btn-import');
  if (b.disabled) return 'the Import button stayed off';
  b.click(); return '';
}, ids);
const summaryShown = () => until(() => /class\(es\) imported/.test(document.getElementById('bar').textContent), null, 20000);
const state = () => ev(() => ({
  rows: [0, 1, 2].map((i) => document.getElementById('st-' + i).textContent),
  bar: document.getElementById('bar').textContent,
  phase: (document.getElementById('phase') || {}).textContent || '',
  buttons: [...document.querySelectorAll('#bar button')].map((b) => b.textContent),
  log: window.__LOG.filter((c) => c.fn === 'executeBatchImportAll').map((c) => ({ ids: c.args[0].map((s) => s.courseId), job: c.args[1], n: c.args.length })),
  sw: document.documentElement.scrollWidth, iw: innerWidth
}));

try {
  console.log('\nthree classes: the second fails, the job pauses a minute, then finishes');
  check('the window lists the courses', await open('main'), 'no rows after 12 s');
  check('ticking three and pressing Import starts it', !(await tick(['cb-0', 'cb-1', 'cb-2'])), 'the Import button stayed off');
  check('it says the window may be closed, and that the import carries on by itself', await until(() => /You can close this window/.test(document.getElementById('bar').textContent)), 'no hint');
  check('while the job waits it says so', await until(() => /⏸/.test((document.getElementById('phase') || {}).textContent || '') && /carries on by itself/.test(document.getElementById('phase').textContent)), 'no pause shown');
  await shot('1-paused');
  check('it finishes with a summary', await summaryShown(), 'no summary after 20 s');
  let s = await state();
  await shot('2-finished');
  check('ONE call for every ticked class, never one per class', s.log.length === 1 && JSON.stringify(s.log[0].ids) === JSON.stringify(['cA', 'cB', 'cC']) && s.log[0].n === 2, JSON.stringify(s.log));
  check('a good class says how many Classroom listed and what was added', /16 in Classroom/.test(s.rows[0]) && /8 added/.test(s.rows[0]) && /8 already here/.test(s.rows[0]), s.rows[0]);
  check('the failed class is named in Google’s words', /❌/.test(s.rows[1]) && /returned code 503/.test(s.rows[1]), s.rows[1]);
  check('the class after it still went, naming a pupil in two ticked courses and one with no address', /20 in Classroom/.test(s.rows[2]) && /also in 11C/.test(s.rows[2]) && /Rue Ha/.test(s.rows[2]) && /no school address for Ian Kwon/.test(s.rows[2]), s.rows[2]);
  check('each good class shows its count on the Students tab at the end', /Now 15 in 11C on the Students tab/.test(s.rows[0]) && /Now 20 in 9B/.test(s.rows[2]), s.rows[0] + ' | ' + s.rows[2]);
  check('the summary counts and names the failed class, and offers to try it again', /Finished\./.test(s.bar) && /2 of 3 class\(es\) imported/.test(s.bar) && /11D/.test(s.bar) && s.buttons.some((t) => /Try the 1 again/.test(t)), s.bar + ' | ' + s.buttons);
  check('nothing wider than the window', s.sw <= s.iw, JSON.stringify({ sw: s.sw, iw: s.iw }));

  const pressed = await ev(() => { const b = [...document.querySelectorAll('#bar button')].find((x) => /Try the/.test(x.textContent)); if (b) b.click(); return !!b; });
  check('Try again finishes with a summary', pressed && await until(() => /3 of 3 class\(es\) imported/.test(document.getElementById('bar').textContent), null, 20000), pressed ? 'no summary' : 'no Try again button');
  s = await state();
  check('Try again starts a NEW job for the failed class alone', s.log.length === 2 && JSON.stringify(s.log[1].ids) === JSON.stringify(['cB']) && s.log[1].job !== s.log[0].job, JSON.stringify(s.log));
  check('the class is in now, and nothing is left to try again', /15 added/.test(s.rows[1]) && !s.buttons.some((t) => /Try the/.test(t)), s.rows[1] + ' | ' + s.buttons);
  check('the first class’s count is shown once, not twice', (s.rows[0].match(/Now /g) || []).length === 1, s.rows[0]);

  console.log('\nthe first call does not answer (its piece was stopped)');
  await open('firstStops'); await tick(['cb-0', 'cb-1', 'cb-2']);
  check('no failure is shown: the window follows the job to its end', await summaryShown(), 'no summary');
  s = await state();
  check('every class is in, nothing to try again', /3 of 3/.test(s.bar) && !/❌/.test(s.rows.join(' ')) && !s.buttons.some((t) => /Try the/.test(t)), s.bar + ' | ' + s.rows.join(' | '));

  console.log('\nthe record stops moving');
  await open('stall'); await tick(['cb-0', 'cb-1', 'cb-2']);
  await until(() => /16 in Classroom/.test(document.getElementById('st-0').textContent));
  await until(() => Object.keys(window.__POLLN).some((k) => window.__POLLN[k] >= 2));   /* the window has seen the record */
  await ev(() => { window.__shift = 13 * 60 * 1000; });
  check('after 12 minutes without a move the window says so, and offers Try again for the rest', await until(() => /has not moved for 12 minutes/.test(document.getElementById('bar').textContent)), await ev(() => document.getElementById('bar').textContent));
  s = await state();
  check('the class that went in keeps its ✅; the others are offered again', /✅/.test(s.rows[0]) && s.buttons.some((t) => /Try the 2 again/.test(t)), s.rows[0] + ' | ' + s.buttons);
  await shot('3-stalled');

  console.log('\nthe formatting was stopped twice');
  await open('formatStopped'); await tick(['cb-0', 'cb-1', 'cb-2']); await summaryShown();
  s = await state();
  check('it says every name is in and Tidy up finishes it', /Every name is in/.test(s.bar) && /Tidy up/.test(s.bar), s.bar);

  console.log('\nnothing new');
  await open('nothingNew'); await tick(['cb-0']); await summaryShown();
  s = await state();
  check('no pupil added or moved: it says the tabs were left alone', /No pupil was added or moved/.test(s.bar), s.bar);

  console.log('\nGoogle will not set the trigger that carries the job on');
  await open('noTrigger'); await tick(['cb-0', 'cb-1', 'cb-2']); await summaryShown();
  s = await state();
  check('Stopped at once, saying why, with Try again for the classes not done', /Stopped\./.test(s.bar) && /would not let the import carry on by itself/.test(s.bar) &&
    s.buttons.some((t) => /Try the 2 again/.test(t)), s.bar + ' | ' + s.buttons);
  await open('noTriggerNamesIn'); await tick(['cb-0', 'cb-1', 'cb-2']); await summaryShown();
  s = await state();
  check('every name in, only the formatting left: Tidy up finishes it', /Every name is in/.test(s.bar) && /Tidy up/.test(s.bar) && !s.buttons.some((t) => /Try the/.test(t)), s.bar);

  console.log('\na class code LEFT');
  await open('nothingNew');
  const leftCode = await ev(() => {
    document.getElementById('cb-0').click();
    const cc = document.getElementById('cc-0'); cc.value = 'Left 2026'; cc.dispatchEvent(new Event('input'));
    return { off: document.getElementById('btn-import').disabled, red: cc.classList.contains('err'), key: document.getElementById('key').textContent };
  });
  check('refused before Import, in words', leftCode.off && leftCode.red && /LEFT is kept for pupils in none of your classes/.test(leftCode.key), JSON.stringify(leftCode));

  console.log('\na new school year: the pupils in none of this year’s classes');
  const box = (id) => ev((id) => {
    const b = document.getElementById(id) || { textContent: '', querySelectorAll: () => [] }, go = document.getElementById('lgo');
    return { text: b.textContent, ticks: [...b.querySelectorAll('[data-em]')].map((x) => x.checked), groups: [...b.querySelectorAll('[data-lg]')].map((x) => (x.indeterminate ? 'some' : x.checked ? 'all' : 'none')),
             btn: go ? go.textContent : '', off: go ? go.disabled : null, red: !!b.querySelector('#lmsg.bad'), sw: document.documentElement.scrollWidth, iw: innerWidth };
  }, id);
  await open('left');
  let L = await box('leftbox');
  check('folded at the top when the window opens: how many, and since when', /5 pupils are in none of the classes imported since 1 August 2026/.test(L.text) && !L.ticks.length && /See them/.test(L.text), L.text);
  await ev(() => [...document.querySelectorAll('#leftbox button')].find((b) => /See them/.test(b.textContent)).click());
  L = await box('leftbox');
  check('opened: nobody ticked at first, by class, and the button asks for ticks (the audit: classes not imported yet were ticked)', L.ticks.length === 5 && !L.ticks.some(Boolean) && L.groups.join() === 'none,none' && L.btn === 'Tick the pupils who have left' && L.off === true, JSON.stringify(L).slice(0, 240));
  check('a whole class whose course was not imported says to import it first', /The whole class\. If 11B is still yours this year, import it first\./.test(L.text), L.text);
  check('a pupil no longer in their course says so; a class with others in it is not called whole', /Ann Ko \(not in its Classroom course now\)/.test(L.text) && !/If 10A is still yours/.test(L.text), L.text);
  check('it says what the press does, and how it is undone', /“LEFT 2026”/.test(L.text) && /records stay/.test(L.text) && /Importing their class again puts them back/.test(L.text), L.text);
  await shot('4-left-open');
  await ev(() => document.querySelector('[data-lg="0"]').click());
  L = await box('leftbox');
  check('ticking a class ticks its pupils, and the button counts them', L.ticks.join() === 'true,false,false,false,false' && L.btn === 'Mark the 1 ticked pupil as Left' && L.groups.join() === 'all,none', JSON.stringify(L).slice(0, 240));
  await ev(() => document.querySelectorAll('[data-lp="1"]')[0].click());
  L = await box('leftbox');
  check('one pupil of that class ticked again: its box shows some, the button counts 2', L.groups.join() === 'all,some' && L.btn === 'Mark the 2 ticked pupils as Left', JSON.stringify(L).slice(0, 240));
  await ev(() => document.querySelectorAll('[data-lp="1"]')[0].click());
  await ev(() => document.getElementById('lgo').click());
  const sent = await until(() => window.__LOG.some((c) => c.fn === 'markPupilsLeft')) && await ev(() => window.__LOG.filter((c) => c.fn === 'markPupilsLeft').map((c) => c.args));
  check('one press sends exactly the ticked pupils, once', JSON.stringify(sent) === '[[["ann.ko@x.kr"]]]', JSON.stringify(sent));
  check('then it says what happened, and lists who is still in none of the classes', await until(() => /1 pupil is in LEFT 2026 now/.test(document.getElementById('leftbox').textContent) && /4 pupils are in none/.test(document.getElementById('leftbox').textContent)),
    (await box('leftbox')).text);
  L = await box('leftbox');
  check('nothing wider than the window with the list open', L.sw <= L.iw, JSON.stringify({ sw: L.sw, iw: L.iw }));

  await open('leftRefused');
  await ev(() => [...document.querySelectorAll('#leftbox button')].find((b) => /See them/.test(b.textContent)).click());
  await ev(() => { document.querySelector('[data-lg="0"]').click(); document.getElementById('lgo').click(); });
  check('a refusal is said in red, the ticks stay as they were, and the button comes back', await until(() => /An import is still running/.test(document.getElementById('leftbox').textContent)) &&
    await ev(() => { const t = [...document.querySelectorAll('#leftbox [data-em]')].map((x) => x.checked).join(), go = document.getElementById('lgo');
      return t === 'true,false,false,false,false' && !go.disabled && go.textContent === 'Mark the 1 ticked pupil as Left' && !!document.querySelector('#lmsg.bad'); }),
    JSON.stringify(await box('leftbox')).slice(0, 240));

  await open('leftBusy');
  check('while an import is running the list is not shown (it would be half-made)', !(await box('leftbox')).text, (await box('leftbox')).text);

  await open('leftAfter'); await tick(['cb-0']); await summaryShown();
  check('after an import: the list is asked for again and shown open under the summary, and the folded one at the top goes',
    await until(() => /4 pupils are in none/.test((document.getElementById('leftbox2') || {}).textContent || '') && !document.getElementById('leftbox').textContent &&
      document.querySelectorAll('#leftbox2 [data-em]').length === 4),
    JSON.stringify([(await box('leftbox')).text, (await box('leftbox2')).text]).slice(0, 240));
  await shot('5-left-after-import');

  /* the audit (7 Oct 2026) */
  console.log('\nthe audit: a refused import, a failed class, the list during an import');
  await open('busyRefused'); await tick(['cb-0', 'cb-1', 'cb-2']); await summaryShown();
  s = await state();
  check('a second import, refused, is over at once: Stopped, with the script’s own words on each class',
    /Stopped\./.test(s.bar) && /Another import is still running/.test(s.bar) && (await ev(() => [0, 1, 2].every((i) => /Another import is still running/.test(document.getElementById('st-' + i).textContent)))), s.bar);
  await open('leftAfterFail'); await tick(['cb-0', 'cb-1']); await summaryShown();
  await wait(600);
  check('after an import with a class that failed, the list is not opened under the summary (it ticked the failed class’s pupils)',
    !(await ev(() => (document.getElementById('leftbox2') || {}).textContent || '')) &&
    !(await ev(() => window.__LOG.some((c) => c.fn === 'getNotThisYear'))), await ev(() => (document.getElementById('leftbox2') || {}).textContent || ''));
  await open('leftWhileImporting');
  await ev(() => [...document.querySelectorAll('#leftbox button')].find((b) => /See them/.test(b.textContent)).click());
  await ev(() => document.querySelector('[data-lg="0"]').click());
  await tick(['cb-0', 'cb-1']);
  await until(() => /carries on by itself/.test(document.body.innerText));
  const during = await ev(() => { const go = document.getElementById('lgo'); return { off: go.disabled, text: go.textContent }; });
  check('while an import runs, “Mark … as Left” waits (the server refuses it then)', during.off === true && /Wait until the import has finished/.test(during.text), JSON.stringify(during));
  check('a class code longer than 16 characters cannot be typed', await ev(() => document.getElementById('cc-0').maxLength === 16), 'maxlength');

  check('no script error', !errors.length, errors.slice(0, 3).join(' | '));
} finally {
  ws.close(); chrome.kill();
  try { fs.rmSync(tmp, { recursive: true, force: true }); } catch {}
}
console.log(`\n${passes} passed, ${fails} failed`);
process.exit(fails ? 1 : 0);
