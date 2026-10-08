#!/usr/bin/env node
/* ============================================================
   tools/teacher-questions.mjs — each question as a square on the teacher page's Lab progress.
   (6 Oct 2026, Daniel: "so that I know exactly where the students had to check multiple times … add this as
   expandable": in a pupil's card, each question a small coloured square; in "Where they get stuck", the questions
   the class most often needed several checks for.)

   The REAL apps-script/Teacher.html, in headless Chrome, with a stand-in for google.script.run that answers
   uiData('progress') with made-up pupils and their first-round letters, and uiData('questions', lab) with made-up
   question words: no spreadsheet, no sign-in. It proves:
   · a pupil's station with letters opens to one square per question, coloured by the first round (f, 1, t, 0),
     with a dot where a later round got it right; a station without letters stays a plain row;
   · opening it shows the first question not right first time, with its words, asked for ONCE per lab;
   · pointing at another square shows that question; a lab whose words cannot be read says why;
   · "Where they get stuck" opens to the questions most often missed at the first check, ranked, counted from the
     pupils in view, with their words; it stays open when a filter changes;
   · bright and dark: the number on a square is readable; a phone: nothing wider than the screen; no script error.
   usage: node tools/teacher-questions.mjs [--file <a Teacher.html>] [--shots <folder>]
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

/* ---------- made-up pupils: 9B (6 pupils) and 9C (2 pupils) ---------- */
const LABS = [{ id: 'digestion-lab', name: 'Digestion Lab', topic: 'Topic 7', questions: 17 }, { id: 'plants-lab', name: 'Plants Lab', topic: 'Topics 6, 8', questions: 5 }];
/* the mouth: 8 questions. Question 4 (index 3) is the one most pupils in 9B miss at the first check. */
const MOUTH = ['ff1tff0f', 'fff1ff00', 'f1f1ffff', 'ffftf0ff', 'fffffff0', 'fff1ffff'];
const pupil = (name, cls, k, extra) => ({ name, cls, cohort: { grad: 2029, title: 'Class of 2029', yearGroup: 'Y9' },
  byLab: Object.assign({ 'digestion-lab': { pct: 60, done: 10, total: 17, complete: false, checks: 30, firstTime: 8, handIns: 3,
    stations: [{ name: 'mouth', done: 6, total: 8, checks: 11 }, { name: 'stomach', done: 4, total: 9, checks: 7 }, { name: 'liver', done: 0, total: 5, checks: 0 }],
    q: { mouth: MOUTH[k % MOUTH.length], stomach: k === 0 ? 'f1t000000' : 'ffff00000' }, b: k === 0 ? { mouth: 'ff1fff0f' } : undefined } }, extra || {}) });
const students = ['Minho Jeon', 'Ria Ham', 'Seohyun Pyo', 'Jiyun Lee', 'Hayeon Choi', 'Dohyun Jung'].map((n, k) => pupil(n, '9B', k));
students.push(pupil('Sihoo Kang', '9C', 0, {}), pupil('Yejin Cho', '9C', 3, {}));
students.forEach((s) => { if (!s.byLab['digestion-lab'].b) delete s.byLab['digestion-lab'].b; });
students[0].byLab['plants-lab'] = { pct: 40, done: 2, total: 5, complete: false, checks: 6, firstTime: 1, handIns: 1, stations: [{ name: 'seed', done: 2, total: 5, checks: 6 }], q: { seed: 'f1t00' } };
const progress = { labs: LABS, classes: ['9B', '9C'], stationNames: { 'digestion-lab': { mouth: 'The mouth', stomach: 'The stomach', liver: 'The liver' }, 'plants-lab': { seed: 'Seeds' } }, students };
const WORDS = { 'digestion-lab': { mouth: ['Name the teeth.', 'What does saliva contain?', 'Which enzyme is in saliva?', 'Explain why chewing helps chemical digestion.', 'Q5 words', 'Q6 words', 'Q7 words', 'Q8 words'],
  stomach: ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8', 'S9'] } };

const STUB = `<style>*{transition:none!important;animation:none!important}</style><script>
window.__PROGRESS = ${JSON.stringify({ ok: true, data: progress })};
window.__WORDS = ${JSON.stringify(WORDS)};
window.__ASKED = [];
window.google = { script: {} };
Object.defineProperty(window.google.script, 'run', { get: function () {
  var s = null, p = new Proxy({}, { get: function (t, k) {
    if (k === 'withSuccessHandler') return function (f) { s = f; return p; };
    if (k === 'withFailureHandler') return function () { return p; };
    return function (a, b) { var ok = s;
      if (k === 'uiData' && a === 'questions') window.__ASKED.push(b);
      setTimeout(function () { if (!ok) return;
        if (k !== 'uiData') return ok({ ok: false });
        if (a === 'progress') return ok(window.__PROGRESS);
        if (a === 'questions') return ok(window.__WORDS[b] ? { ok: true, data: window.__WORDS[b] } : { ok: false, why: 'the lab’s page could not be read (a test)' });
        ok({ ok: false, why: 'not in this check' }); }, 40); };
  } });
  return p;
} });
</script>`;

/* ---------- a browser ---------- */
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'teacher-q-'));
const page = () => {
  const f = path.join(tmp, 'progress.html');
  fs.writeFileSync(f, fs.readFileSync(FILE, 'utf8')
    .replace('__BOOT__', () => JSON.stringify({ email: 'teacher@x.kr', tab: 'progress', analysis: '', hub: '' }))
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
/* contrast of the number on a square against the square */
const contrast = () => ev(() => {
  const lum = (c) => { const m = c.match(/\d+(\.\d+)?/g).slice(0, 3).map(Number).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
    return 0.2126 * m[0] + 0.7152 * m[1] + 0.0722 * m[2]; };
  return ['f', 'm', 't'].map((k) => { const b = document.querySelector('#drawb .sq.' + k); if (!b) return [k, 0];
    const cs = getComputedStyle(b), a = lum(cs.color), c = lum(cs.backgroundColor);
    return [k, (Math.max(a, c) + 0.05) / (Math.min(a, c) + 0.05)]; });
});

try {
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'dark' }] });
  await send('Page.navigate', { url: page() });
  check('Lab progress draws', await until(() => document.querySelectorAll('.hm td.name').length >= 8), 'no pupils after 6 s');

  console.log('\na pupil’s card');
  await ev(() => [...document.querySelectorAll('.hm td.name')].find((td) => /Minho Jeon/.test(td.textContent)).click());
  await until(() => document.getElementById('draw').classList.contains('on'));
  let c = await ev(() => {
    const d = [...document.querySelectorAll('#drawb details.dqd')];
    const mouth = d.find((x) => x.getAttribute('data-st') === 'mouth');
    return { n: d.length, plain: [...document.querySelectorAll('#drawb .dst')].filter((x) => !x.closest('details')).map((x) => x.textContent),
      open: d.some((x) => x.open), sq: mouth ? [...mouth.querySelectorAll('.sq')].map((b) => b.className.replace('sq ', '') + ':' + b.textContent) : [] };
  });
  check('each station with letters opens (closed at first); one without stays a plain row', c.n === 3 && !c.open && c.plain.some((t) => /The liver/.test(t)), JSON.stringify(c).slice(0, 300));
  check('one square per question, coloured by the first round, a dot where a later round got it right',
    JSON.stringify(c.sq) === JSON.stringify(['f:1', 'f:2', 'm:3', 't later:4', 'f:5', 'f:6', 'z:7', 'f:8']), JSON.stringify(c.sq));
  check('the station line says how many checks it took', await ev(() => /6\/8 · 11 checks/.test(document.querySelector('#drawb details[data-st="mouth"] summary').textContent)), 'no checks on the line');
  await ev(() => { const d = document.querySelector('#drawb details[data-st="mouth"]'); d.open = true; });
  check('opening it shows the first question not right first time, with its words',
    await until(() => /Question 3/.test(document.querySelector('#drawb details[data-st="mouth"] .dq__say').textContent) && /Which enzyme is in saliva\?/.test(document.querySelector('#drawb details[data-st="mouth"] .dq__say').textContent)),
    await ev(() => document.querySelector('#drawb details[data-st="mouth"] .dq__say').textContent));
  await shot('1-card-open');
  await ev(() => document.querySelector('#drawb details[data-st="mouth"] .sq[data-q="3"]').dispatchEvent(new MouseEvent('mouseenter')));
  check('pointing at another square shows that question, and that it was right in a later round',
    await until(() => { const t = document.querySelector('#drawb details[data-st="mouth"] .dq__say').textContent; return /Question 4/.test(t) && /right in a later round/.test(t) && /Explain why chewing/.test(t); }),
    await ev(() => document.querySelector('#drawb details[data-st="mouth"] .dq__say').textContent));
  await ev(() => { document.querySelector('#drawb details[data-st="stomach"]').open = true; });
  await until(() => /S2/.test(document.querySelector('#drawb details[data-st="stomach"] .dq__say').textContent));
  check('the words of a lab are asked for once, however many of its stations are opened', (await ev(() => window.__ASKED)).filter((x) => x === 'digestion-lab').length === 1, JSON.stringify(await ev(() => window.__ASKED)));
  check('the key is shown once, at the top of the card', await ev(() => document.querySelectorAll('#drawb .sqkey').length === 1 && !document.querySelector('#drawb details .sqkey')), 'not once at the top');
  check('the key names every colour', await ev(() => { const t = document.querySelector('#drawb .sqkey').textContent; return ['right first time', 'right after more checks', 'tried, not right yet', 'not tried', 'right in a later round'].every((w) => t.includes(w)); }), 'a colour is missing from the key');
  check('the page is dark here', await ev(() => document.documentElement.getAttribute('data-theme') !== 'light'), 'it is bright');
  const k = await contrast();
  check('dark: the number on each square is readable (3:1 or more)', k.every(([, r]) => r >= 3), JSON.stringify(k));
  await ev(() => { document.documentElement.setAttribute('data-theme', 'light'); });
  const kl = await contrast();
  check('bright: the number on each square is readable (3:1 or more)', kl.every(([, r]) => r >= 3), JSON.stringify(kl));
  await shot('2-card-bright');
  await ev(() => { document.documentElement.setAttribute('data-theme', 'dark'); });
  await ev(() => { const p = document.querySelector('#drawb details[data-lab="plants-lab"]'); p.open = true; });
  check('a lab whose words cannot be read says why, and keeps the squares',
    await until(() => /could not be read/.test(document.querySelector('#drawb details[data-lab="plants-lab"] .dq__say').textContent)),
    await ev(() => document.querySelector('#drawb details[data-lab="plants-lab"] .dq__say').textContent));
  await ev(() => document.getElementById('drawx').click());

  console.log('\nwhere they get stuck');
  let h = await ev(() => { const d = document.getElementById('hq'); return d ? { open: d.open, rows: d.querySelectorAll('.hqrow').length } : null; });
  check('the questions list is there, closed at first', h && !h.open && h.rows > 0, JSON.stringify(h));
  await ev(() => { document.getElementById('hq').open = true; });
  await until(() => /Explain why chewing/.test(document.querySelector('#hq .hqrow').textContent));
  h = await ev(() => [...document.querySelectorAll('#hq .hqrow')].map((r) => r.textContent.replace(/\s+/g, ' ').trim()));
  check('the question most often missed at the first check comes first, with its count and words',
    /The mouth · question 4/.test(h[0]) && /7 of 8 not right at the first check \(3 right after more checks, 4 not yet\)/.test(h[0]) && /Explain why chewing/.test(h[0]), h[0]);
  await ev(() => document.getElementById('hq').scrollIntoView());
  await shot('3-stuck-open');
  await ev(() => { const s = document.getElementById('pcl'); s.value = '9B'; s.dispatchEvent(new Event('change')); });
  await wait(300);
  h = await ev(() => { const d = document.getElementById('hq'); return { open: d && d.open, first: d && d.querySelector('.hqrow') && d.querySelector('.hqrow').textContent.replace(/\s+/g, ' ') }; });
  check('choosing a class keeps it open and counts only that class', h.open && /5 of 6 not right at the first check \(3 right after more checks, 2 not yet\)/.test(h.first), JSON.stringify(h));

  console.log('\na phone');
  await send('Emulation.setDeviceMetricsOverride', { width: 375, height: 812, deviceScaleFactor: 1, mobile: true });
  await wait(300);
  const w1 = await ev(() => ({ sw: document.documentElement.scrollWidth, iw: innerWidth }));
  check('the open list: nothing wider than the screen', w1.sw <= w1.iw, JSON.stringify(w1));
  await ev(() => [...document.querySelectorAll('.hm td.name')][0].click());
  await wait(300);
  await ev(() => { document.querySelectorAll('#drawb details.dqd').forEach((d) => { d.open = true; }); });
  await wait(300);
  const w2 = await ev(() => { const b = document.getElementById('drawb'); return { sw: b.scrollWidth, cw: b.clientWidth, page: document.documentElement.scrollWidth, iw: innerWidth }; });
  await shot('4-phone-card');
  check('a pupil’s card with every station open: nothing wider than the screen', w2.sw <= w2.cw + 1 && w2.page <= w2.iw, JSON.stringify(w2));

  check('no script error', !errors.length, errors.slice(0, 3).join(' | '));
} finally {
  ws.close(); chrome.kill();
  try { fs.rmSync(tmp, { recursive: true, force: true }); } catch {}
}
console.log(`\n${passes} passed, ${fails} failed`);
process.exit(fails ? 1 : 0);
