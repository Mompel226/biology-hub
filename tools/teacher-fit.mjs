#!/usr/bin/env node
/* ============================================================
   tools/teacher-fit.mjs — the teacher page's class tables fit the window, with their keys in sight.
   (6 Oct 2026, Daniel: "I have to scroll down quite a bit to then see the keys … it's not very easy to see all of the
   information at once", in ⏱️ Homework habits and Lab progress.)

   The REAL apps-script/Teacher.html, in headless Chrome, with a stand-in for google.script.run that answers uiData with
   invented pupils (24 in one class, the size of the class in his screenshot; every name is invented): no spreadsheet, no sign-in. For ⏱️ Homework habits, Lab
   progress, Bio English and Write-Up (8 Oct 2026), at a short window like his (1000 × 490), a laptop (1440 × 900), a large screen
   (1920 × 1000) and a phone (375 × 812), it proves:
   · the first screen: while the class table is on screen, its key is in sight (it stays at the foot of the window);
   · one scroll of the page brings the table's top under the pinned header, and then the whole box AND its key are
     inside the window (the pupils scroll inside the box);
   · one line per pupil on a computer (the habit, or the class, beside the name);
   · a phone: nothing wider than the screen.
   usage: node tools/teacher-fit.mjs [--file <a Teacher.html>] [--shots <folder>]
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

/* ---------- invented pupils (no real names, ever) ---------- */
const NAMES = ['Minho Jeon', 'Moonhee Seol', 'Moseon Ko', 'Ria Ham', 'Seohyun Pyo', 'Jiyun Lee', 'Hayeon Choi', 'Dohyun Jung',
  'Sihoo Kang', 'Yejin Cho', 'Haein Yoon', 'Jihan Jang', 'Seoah Lim', 'Chaerin Han', 'Juyeon Oh', 'Yuri Seo',
  'Garam Shin', 'Ivy Kwon', 'Elin Hwang', 'Dain Ahn', 'Minsu Song', 'Taemin Yoo', 'Sohyun Hong', 'Juho Moon'];
const email = (n) => n.toLowerCase().replace(/ /g, '.') + '@pupils.x.kr';
const BANDS = ['early', 'good', 'last', 'late', 'none', 'open', 'before', 'unknown'];
const HW = [0, 1, 2].map((i) => ({ title: ['Classification Homework', 'Cells: membranes', 'Enzymes'][i] + ' ' + (i + 1),
  set: (i + 1) + ' Oct, 08:00', due: (i + 7) + ' Oct, 22:00', day: (i + 7) + ' Oct, 22:00', who: '9B', med: '1 day 2 h', withTimes: 20 }));
const habits = { recorded: true, bands: { early: 50, good: 85 }, flagWords: 'Worth a look: very fast and almost all right first time.', left: 0,
  words: { before: 'done before it was set', early: 'early', good: 'in good time', last: 'last minute', late: 'late', none: 'not done', open: 'still open', unknown: 'finished before times were kept' },
  homework: HW,
  pupils: NAMES.map((n, k) => ({ name: n, cls: '9B',
    habit: k % 3 ? { say: ['Usually early', 'Usually the last minute', 'Only after a reminder'][k % 3], why: 'from the last 6', o: k % 3 } : null,
    flags: k === 5 ? [{ h: 1, says: 'very fast for this pupil' }] : [],
    cells: HW.map((h, i) => [i, BANDS[(k + i) % BANDS.length], (k + i) % 4 === 0 ? 1 : 0, 10 + k, 6, 10, 3, 0, '2 h', '1 Oct, 19:00', '1 Oct, 21:00']) })) };
const LABS = [['digestion-lab', 'Digestion Lab', 'Topic 7', 123], ['classification-lab', 'Classification Lab', 'Topic 1', 64],
  ['plants-lab', 'Plants Lab', 'Topics 6, 8', 116], ['circulation-lab', 'Circulation Lab', 'Topic 9', 115]]
  .map(([id, name, topic, questions]) => ({ id, name, topic, questions }));
const progress = { labs: LABS, stationNames: { 'digestion-lab': { mouth: 'The mouth', stomach: 'The stomach' } },
  students: NAMES.map((n, k) => ({ name: n, cls: '9B', email: email(n), cohort: { grad: 2029, title: 'Class of 2029', yearGroup: 'Y9' },
    byLab: Object.fromEntries(LABS.filter((l, i) => (k + i) % 3).map((l) => [l.id, { pct: 30 + (k * 7) % 70, done: 40, total: l.questions,
      complete: k % 5 === 0, checks: 60 + k, firstTime: 30, handIns: 4, stations: [{ name: 'mouth', done: 6, total: 8 }, { name: 'stomach', done: 3, total: 9 }] }])) })) };
const english = { english: { years: [{ y: 9, title: 'Year 9', units: ['t3'] }], units: { t3: { n: '3', title: 'Movement in and out of cells', sets: ['t3.kw', 't3.d1', 't3.e1'] } },
  sets: [{ id: 'm.describe', unit: null, kind: 'method', title: 'How to describe', total: 3 }, { id: 't3.kw', unit: 't3', kind: 'kw', title: 'Keywords', total: 10 },
    { id: 't3.d1', unit: 't3', kind: 'describe', title: 'Describe 1', total: 5 }, { id: 't3.e1', unit: 't3', kind: 'explain', title: 'Explain 1', total: 4 }] },
  students: NAMES.map((n) => ({ name: n, cls: '9B', email: email(n) })),
  progress: Object.fromEntries(NAMES.map((n, k) => [email(n), { sets: { 't3.kw': [k % 11, k % 6], 't3.d1': [k % 6, 2] } }])) };
/* the Write-Up view (8 Oct 2026): the site's real list of parts, so the table is as wide as the real one */
const WUP = JSON.parse(fs.readFileSync(path.join(ROOT, '../../labs/write-up-lab/data/parts.json'), 'utf8'));
const writeup = { writeup: { stages: WUP.stages, parts: WUP.parts.map((p) => ({ id: p.id, title: p.title, stage: p.stage, units: p.units,
    marks: (p.redpens || []).reduce((a, y) => a + y.n, 0), questions: p.questions })) },
  students: NAMES.map((n) => ({ name: n, cls: '9B', email: email(n) })),
  progress: Object.fromEntries(NAMES.map((n, k) => [email(n), { parts: Object.fromEntries(WUP.parts.filter((p, i) => (k + i) % 3).map((p, i) =>
    [p.id, [Math.min(p.units, (k * 3 + i) % (p.units + 1)), 2, 3, 1, (k + i) % 7 === 0 ? 1 : 0]])) }])) };
const FAKE = { habits: { ok: true, data: habits }, progress: { ok: true, data: progress }, english: { ok: true, data: english }, writeup: { ok: true, data: writeup } };

/* google.script.run, answering uiData from FAKE; every call gets its own handlers */
const STUB = `<script>
window.__FAKE = ${JSON.stringify(FAKE)};
window.google = { script: {} };
Object.defineProperty(window.google.script, 'run', { get: function () {
  var s = null, p = new Proxy({}, { get: function (t, k) {
    if (k === 'withSuccessHandler') return function (f) { s = f; return p; };
    if (k === 'withFailureHandler') return function () { return p; };
    return function (a) { var ok = s; setTimeout(function () { if (ok) ok(k === 'uiData' ? (window.__FAKE[a] || { ok: false, why: 'not in this check' }) : { ok: false }); }, 20); };
  } });
  return p;
} });
</script>`;

/* ---------- a browser ---------- */
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'teacher-fit-'));
const page = (tab) => {
  const f = path.join(tmp, tab + '.html');
  const html = fs.readFileSync(FILE, 'utf8')
    .replace('__BOOT__', () => JSON.stringify({ email: 'teacher@x.kr', tab, analysis: '', hub: '' }))
    .replace(/<head>/i, (m) => m + STUB);
  fs.writeFileSync(f, html);
  return 'file://' + f;
};
const port = 9900 + (process.pid % 90);
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

/* ---------- the checks ---------- */
const VIEWS = [['habits', '⏱️ Homework habits', '.hbwrap', '.hbkey'], ['progress', 'Lab progress', '.hmwrap', '.hmleg'], ['english', 'Bio English', '.hmwrap', '.hmleg'], ['writeup', 'Write-Up', '.hmwrap', '.hmleg']];
const SIZES = [[1000, 490, 'a short window (his)'], [1440, 900, 'a laptop'], [1920, 1000, 'a large screen'], [375, 812, 'a phone']];
const measure = (sel) => ev((s) => {
  const top = document.querySelector('.top').getBoundingClientRect().bottom, box = document.querySelector(s[0]);
  if (!box) return null;
  const key = box.parentElement.querySelector(s[1]), b = box.getBoundingClientRect(), k = key.getBoundingClientRect();
  const name = box.querySelector('tbody td.name'), rowH = name ? name.getBoundingClientRect().height : 0;
  return { top, ih: innerHeight, iw: innerWidth, sw: document.documentElement.scrollWidth, box: [b.top, b.bottom], key: [k.top, k.bottom], rowH };
}, sel);
try {
  for (const [tab, title, boxSel, keySel] of VIEWS) {
    console.log('\n' + title);
    for (const [w, h, what] of SIZES) {
      await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: w < 600 });
      await send('Page.navigate', { url: page(tab) });
      let m = null;
      for (let i = 0; i < 40 && !m; i++) { await wait(150); m = await measure([boxSel, keySel]).catch(() => null); }
      if (!m) { check(what + ': the view draws', false, 'no table box after 6 s'); continue; }
      await wait(250); m = await measure([boxSel, keySel]);
      await shot(tab + '-' + w + 'x' + h + '-1-first');
      if (w < 600) { check(what + ': nothing wider than the screen', m.sw <= m.iw, JSON.stringify({ sw: m.sw, iw: m.iw })); continue; }
      const onScreen = m.box[0] + 120 < m.ih;          /* a few rows of the table in sight, not just its top edge */
      check(what + ': the first screen shows the table’s key while the table is on screen',
        !onScreen || (m.key[0] >= m.top - 1 && m.key[1] <= m.ih + 1), JSON.stringify({ key: m.key, window: m.ih, header: m.top }));
      /* one scroll of the page: the table's top to just under the pinned header */
      await ev((s) => { const t = document.querySelector('.top').getBoundingClientRect().bottom; window.scrollBy(0, document.querySelector(s).getBoundingClientRect().top - t); }, boxSel);
      await wait(200);
      const n2 = await measure([boxSel, keySel]);
      await shot(tab + '-' + w + 'x' + h + '-2-scrolled');
      check(what + ': one scroll, and the whole box and its key are inside the window',
        n2.box[0] >= n2.top - 2 && n2.box[1] <= n2.key[0] + 1 && n2.key[1] <= n2.ih + 1, JSON.stringify({ box: n2.box, key: n2.key, window: n2.ih, header: n2.top }));
      if (w === 1440) check(what + ': one line per pupil', m.rowH > 0 && m.rowH <= 44, 'a pupil’s row is ' + Math.round(m.rowH) + ' px tall');
    }
  }
  check('no script error', !errors.length, errors.slice(0, 3).join(' | '));
} finally {
  ws.close(); chrome.kill();
  try { fs.rmSync(tmp, { recursive: true, force: true }); } catch {}
}
console.log(`\n${passes} passed, ${fails} failed`);
process.exit(fails ? 1 : 0);
