#!/usr/bin/env node
/* ============================================================
   tools/teacher-rounds.mjs — every round of a station on the teacher page's Lab progress (7 Oct 2026, Daniel: "round one
   should show how they did in round one, how they did in round two, in a summarised way"; "a total checks per question,
   no matter the number of rounds, and per round … if they're failing the same questions despite the rounds"; "hover
   tips … what is that average").

   The REAL apps-script/Teacher.html, in headless Chrome, with a stand-in for google.script.run that answers
   uiData('progress') with made-up pupils and their rounds (e.rd, as _roundsForTeacher_ gives them), and
   uiData('questions', lab) with made-up words. It proves:
   · the heatmap marks a lab where a pupil started a station again (↻), and its tip says so; a tile counts them;
   · Stuck reads round 1's checks: a pupil who practised a lot is not flagged for it;
   · a pupil's station opens to one row of squares per round under the question numbers: the colour is that round, the
     number its checks; "All rounds" adds them up; a question failed again is marked (✕) and named in the summary line;
   · rounds kept together read "Rounds 2–7"; a round whose answers were not kept is hatched and says why;
   · pointing at a square in a later round names the round, its checks, all rounds' checks and "failed again";
   · "Where they get stuck" adds how many answered it again, how many failed again, and every check;
   · every tile, flag and label explains itself (data-tip); bright and dark readable; a phone: nothing wider than the
     screen (a long station scrolls inside its card); no script error.
   usage: node tools/teacher-rounds.mjs [--file <a Teacher.html>] [--shots <folder>]
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

/* ---------- made-up pupils, 9B ---------- */
const LABS = [{ id: 'cells-lab', name: 'Cells Lab', topic: 'Topic 2', questions: 30 }, { id: 'digestion-lab', name: 'Digestion Lab', topic: 'Topic 7', questions: 17 }];
const base = (o) => Object.assign({ pct: 60, done: 10, total: 17, complete: false, checks: 30, firstTime: 8, handIns: 3,
  stations: [{ name: 'mouth', done: 6, total: 8, checks: 11 }, { name: 'stomach', done: 4, total: 9, checks: 7 }] }, o);
const pupil = (name, lab) => ({ name, cls: '9B', cohort: { grad: 2029, title: 'Class of 2029', yearGroup: 'Y9' }, byLab: { 'digestion-lab': lab } });
const students = [
  /* round 2 of the mouth: question 4 tried and not right in round 1, and again in round 2 (failed again) */
  pupil('Minho Jeon', base({ checks: 30, c1: 22, ag: 1, rs: 1,
    q: { mouth: 'ff1tff0f', stomach: 'f1t000000' },
    rd: { mouth: ['ff1tff0f.11331101', '0f0t0000.01020000'], stomach: ['f1t000000.132000000'] }, rx: { stomach: 2 } })),
  /* three rounds; question 4 right after more checks in round 1, tried in round 2, right after more in round 3 */
  pupil('Ria Ham', base({ checks: 40, c1: 12, ag: 1, q: { mouth: 'fff1ff00' },
    rd: { mouth: ['fff1ff00.11131100', '000t0000.00020000', '0001ffff.00031111'] } })),
  /* twelve rounds of the mouth: rounds 2 to 7 kept together */
  pupil('Seohyun Pyo', base({ checks: 90, c1: 14, ag: 1, q: { mouth: 'f1f1ffff' },
    rd: { mouth: ['f1f1ffff.13121111', 'ff1f0000.66e60000*6', 'ffff0000.11110000', 'ffff0000.11110000', 'ffff0000.11110000', 'ffff0000.11110000',
                  'ffff0000.11110000', 'ffff0000.11110000', 'fff1ffff.11131111', '0f000000.01000000'] } })),
  /* a pupil on round 2 from before rounds were kept: round 1's checks not by question, the round between not kept */
  pupil('Jiyun Lee', base({ checks: 60, c1: 10, pct: 60, ag: 1, q: { mouth: 'ffftf0ff' },
    rd: { mouth: ['ffftf0ff.', '', '000t0000.00010000'] }, rx: { mouth: 40 } })),
  /* round 1 only: one row, no "All rounds" */
  pupil('Hayeon Choi', base({ checks: 12, c1: 12, ag: 0, q: { mouth: 'fffffff0' }, rd: { mouth: ['fffffff0.11111110'] } })),
  /* many checks in round 1 and under 75%: Stuck */
  pupil('Dohyun Jung', base({ checks: 50, c1: 50, ag: 0, pct: 40, q: { mouth: 'fff1ffff' }, rd: { mouth: ['fff1ffff.111a1111'] } })),
  /* the second audit (7 Oct 2026): round 1 never recorded (the first-round record is all "0"), and a station called "constructor" */
  pupil('Bora Lim', base({ checks: 20, c1: 18, ag: 1, q: { mouth: '00000000' }, b: { mouth: 'ftf00000' }, rd: { mouth: ['', '0t000000.02000000'] },
    stations: [{ name: 'mouth', done: 2, total: 8, checks: 9 }, { name: 'constructor', done: 1, total: 3, checks: 2 }] }))
];
const progress = { labs: LABS, classes: ['9B'], stationNames: { 'digestion-lab': { mouth: 'The mouth', stomach: 'The stomach' } }, students };
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
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'teacher-r-'));
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
  check('Lab progress draws', await until(() => document.querySelectorAll('.hm td.name').length >= 7), 'no pupils after 6 s');
  const stl0 = await ev(() => document.getElementById('stl').value);
  check('“Where they get stuck” starts on a lab the students in view have worked in (it started on the first lab, nobody’s)', stl0 === 'digestion-lab', stl0);
  await ev(() => { const s = document.getElementById('stl'); s.value = 'cells-lab'; s.dispatchEvent(new Event('change')); });
  const why = await ev(() => { const e = [...[...document.querySelectorAll('.sec')].find((x) => /Where they get stuck/.test(x.textContent)).querySelectorAll('.empty')].filter((x) => !x.closest('#hq')).pop(); return e ? e.textContent : ''; });
  check('a lab nobody in view has started says so, and what to do', /None of the 7 students in view has saved any work in Cells yet/.test(why) && /Choose another lab/.test(why), why);
  await ev(() => { const s = document.getElementById('stl'); s.value = 'digestion-lab'; s.dispatchEvent(new Event('change')); });

  console.log('\nthe class');
  let c = await ev(() => {
    const cell = (nm) => [...document.querySelectorAll('.hm tbody tr')].find((tr) => tr.textContent.includes(nm)).querySelectorAll('.cbox')[1];
    const tile = [...document.querySelectorAll('.tile')].find((t) => /Practised again/i.test(t.textContent));
    const flagsOf = (nm) => [...document.querySelectorAll('.attr')].filter((a) => a.textContent.includes(nm)).map((a) => [...a.querySelectorAll('.flag')].map((f) => f.textContent).join(','));
    return { mk: cell('Minho Jeon').className, mkTip: cell('Minho Jeon').getAttribute('data-tip'), hy: cell('Hayeon Choi').className,
      tile: tile && tile.querySelector('.tile__v').textContent, tileTip: tile && tile.getAttribute('data-tip'),
      jiwoo: flagsOf('Jiyun Lee'), doyun: flagsOf('Dohyun Jung'),
      card: [...document.querySelectorAll('.labc .hard')].map((h) => h.textContent).join(' | '),
      tipsMissing: [...document.querySelectorAll('.tile, .stat > div, .flag, .attr__i, .attr__p')].filter((x) => !x.getAttribute('data-tip')).length };
  });
  check('the heatmap marks a lab where they started a station again (↻), and its tip says so', /again/.test(c.mk) && !/again/.test(c.hy) && /Started 1 station again; reset the whole lab 1×/.test(c.mkTip) && /\(22 in round 1\)/.test(c.mkTip), JSON.stringify([c.mk, c.hy, c.mkTip]));
  check('a tile counts the pupils who practised again, and says what a round is', c.tile === '5' && /new ROUND/.test(c.tileTip || ''), JSON.stringify([c.tile, c.tileTip]));
  check('Stuck reads round 1’s checks: practising a lot is not being stuck', c.jiwoo.join('') === '' && c.doyun.some((f) => /Stuck/.test(f)), JSON.stringify([c.jiwoo, c.doyun]));
  check('the lab’s card says how many practised again', /Practised again: 5 of 7 · reset the whole lab: 1/.test(c.card), c.card);
  check('every tile, lab number and flag explains itself (hover)', c.tipsMissing === 0, c.tipsMissing + ' without a tip');
  await shot('r1-class');

  console.log('\na pupil’s card');
  const openFor = async (nm) => { await ev((nm) => [...document.querySelectorAll('.hm td.name')].find((td) => td.textContent.includes(nm)).click(), nm);
    await until(() => document.getElementById('draw').classList.contains('on')); };
  await openFor('Minho Jeon');
  c = await ev(() => {
    const chips = [...document.querySelectorAll('#drawb .dchip')].map((x) => x.textContent);
    const m = document.querySelector('#drawb details[data-st="mouth"]');
    return { chips, sum: m.querySelector('summary').textContent, badges: [...m.querySelectorAll('.rbadge')].map((b) => b.textContent) };
  });
  check('the lab says every check, round 1’s, the stations started again and the resets', ['30 checks', '22 in round 1', '↺ 1 station again', '1× reset'].every((t) => c.chips.includes(t)), JSON.stringify(c.chips));
  check('a station on round 2 says so, and how many questions were failed again, before it is opened', JSON.stringify(c.badges) === JSON.stringify(['↺ 2', '✕ 1']), JSON.stringify(c.badges));
  await ev(() => { document.querySelector('#drawb details[data-st="mouth"]').open = true; });
  await wait(150);
  c = await ev(() => {
    const m = document.querySelector('#drawb details[data-st="mouth"]');
    const rows = [...m.querySelectorAll('.rq__r')].map((r) => ({ l: r.querySelector('.rq__l').textContent,
      cells: [...r.querySelectorAll('.sq, .rq__q, .rq__t')].map((x) => (x.classList.contains('sq') ? x.className.replace('sq ', '').replace(' on', '') + ':' : '') + x.textContent + (x.classList.contains('ag') ? '✕' : '')) }));
    return { rows, sum: m.querySelector('.rq__s').textContent, x: (document.querySelector('#drawb details[data-st="stomach"] .rq__x') || {}).textContent || '' };
  });
  const R = c.rows;
  check('one row per round under the question numbers, coloured by that round, the number its checks',
    R.length === 4 && R[0].cells.join(',') === '1,2,3,4✕,5,6,7,8' && R[1].l === 'Round 1' && R[1].cells.join(',') === 'f:1,f:1,m:3,t:3,f:1,f:1,z:,f:1' &&
    R[2].l === 'Round 2 now' && R[2].cells.join(',') === 'z:,f:1,z:,t:2,z:,z:,z:,z:', JSON.stringify(R).slice(0, 600));
  check('“All rounds” adds every round’s checks at each question, the one failed again ringed', R[3].l === 'All rounds' && R[3].cells.join(',') === '1,2,3,5✕,1,1,,1', JSON.stringify(R[3]));
  check('the line under it says each round, and names the question failed again', /Round 1: 7 of 8 tried, 5 right first time, 11 checks · Round 2 \(now\): 2 of 8 tried, 1 right, 3 checks · failed again: question 4/.test(c.sum), c.sum);
  await ev(() => { document.querySelector('#drawb details[data-st="mouth"] .sq[data-r="1"][data-q="3"]').dispatchEvent(new MouseEvent('mouseenter')); });
  check('pointing at a square in a later round names the round, its checks, every round’s checks and “failed again”, with the words',
    await until(() => { const t = document.querySelector('#drawb details[data-st="mouth"] .dq__say').textContent;
      return /Question 4 · round 2: tried, not right yet, 2 checks · all rounds: 5 checks · failed again/.test(t) && /Explain why chewing/.test(t); }),
    await ev(() => document.querySelector('#drawb details[data-st="mouth"] .dq__say').textContent));
  await ev(() => { document.querySelector('#drawb details[data-st="stomach"]').open = true; });
  check('checks at a station not split by question are said, and why', await until(() => /\+2 checks at this station not split by question/.test((document.querySelector('#drawb details[data-st="stomach"] .rq__x') || {}).textContent || '')), 'no line');
  check('a station on round 1 only: one row, no “All rounds”', await ev(() => { const s = document.querySelector('#drawb details[data-st="stomach"]');
    return s.querySelectorAll('.rq__r').length === 2 && !/All rounds/.test(s.textContent); }), 'more rows than one round');
  await shot('r2-card');
  await ev(() => document.getElementById('drawx').click());

  await openFor('Seohyun Pyo');
  await ev(() => { document.querySelector('#drawb details[data-st="mouth"]').open = true; });
  c = await ev(() => [...document.querySelectorAll('#drawb details[data-st="mouth"] .rq__l')].map((x) => x.textContent));
  check('rounds kept together read “Rounds 2–7”, then the newest, one by one', c.join('|') === '|Round 1|Rounds 2–7|Round 8|Round 9|Round 10|Round 11|Round 12|Round 13|Round 14|Round 15 now|All rounds', c.join('|'));
  c = await ev(() => document.querySelector('#drawb details[data-st="mouth"] .rq__s').textContent);
  check('many rounds are said in one short line: round 1, the rounds between together, the round they are on', /^Round 1: 8 of 8 tried, 6 right first time, 11 checks · Rounds 2–14: 13 rounds, 66 checks \(a row each above\) · Round 15 \(now\): 1 of 8 tried, 1 right, 1 check · failed again: question 4$/.test(c), c);
  await shot('r3-folded');
  await ev(() => document.getElementById('drawx').click());

  await openFor('Jiyun Lee');
  await ev(() => { document.querySelector('#drawb details[data-st="mouth"]').open = true; });
  c = await ev(() => { const m = document.querySelector('#drawb details[data-st="mouth"]');
    return { u: m.querySelectorAll('.rq__r')[2].querySelectorAll('.sq.u').length, tip: m.querySelectorAll('.rq__l')[2].getAttribute('data-tip'),
      r1: [...m.querySelectorAll('.rq__r')[1].querySelectorAll('.sq')].map((b) => b.textContent).join(''), x: (m.querySelector('.rq__x') || {}).textContent || '' }; });
  check('a round whose answers were not kept is hatched, and its label says why', c.u === 8 && /not kept: it was before 7 Oct 2026/.test(c.tip), JSON.stringify(c));
  check('round 1 from before 7 Oct: its colours, no numbers; its checks said as not split by question', c.r1 === '' && /\+40 checks/.test(c.x), JSON.stringify(c));
  await ev(() => document.getElementById('drawx').click());

  await openFor('Bora Lim');
  await ev(() => { const d = document.querySelector('#drawb details[data-st="mouth"]'); if (d) d.open = true; });
  await wait(150);
  c = await ev(() => { const m = document.querySelector('#drawb details[data-st="mouth"]');
    return { u: m ? m.querySelectorAll('.rq__r')[1].querySelectorAll('.sq.u').length : -1, st: [...document.querySelectorAll('#drawb .dst')].map((x) => x.textContent).join(' | ') }; });
  check('round 1 never recorded is hatched (not "not tried"), though the first-round record reads all 0', c.u === 8, JSON.stringify(c));
  check('a station called "constructor" draws as a station, and the card opens', /constructor/.test(c.st), c.st.slice(0, 200));
  await ev(() => document.getElementById('drawx').click());

  console.log('\nwhere they get stuck');
  await ev(() => { document.getElementById('hq').open = true; });
  await until(() => /Explain why chewing/.test(document.querySelector('#hq .hqrow').textContent));
  let h = await ev(() => [...document.querySelectorAll('#hq .hqrow')].map((r) => r.textContent.replace(/\s+/g, ' ').trim()));
  check('question 4 comes first, with who answered it again, who failed again and every check',
    /The mouth · question 4/.test(h[0]) && /5 of 6 not right at the first check/.test(h[0]) && /answered again by 4, 4 failed again/.test(h[0]) && /42 checks in all rounds/.test(h[0]), h[0]);
  await ev(() => document.getElementById('hq').scrollIntoView());
  await shot('r4-stuck');

  console.log('\nbright, dark and a phone');
  await openFor('Ria Ham');
  await ev(() => { document.querySelector('#drawb details[data-st="mouth"]').open = true; });
  const k = await contrast();
  check('dark: the number on each square is readable (3:1 or more)', k.every(([, r]) => r >= 3), JSON.stringify(k));
  await ev(() => { document.documentElement.setAttribute('data-theme', 'light'); });
  const kl = await contrast();
  check('bright: the number on each square is readable (3:1 or more)', kl.every(([, r]) => r >= 3), JSON.stringify(kl));
  const tl = await ev(() => { const t = document.querySelector('#drawb .rq__t'); return t ? getComputedStyle(t).backgroundColor : ''; });
  check('bright: “All rounds” is shaded', !!tl && tl !== 'rgba(0, 0, 0, 0)', tl);
  await shot('r5-bright');
  await ev(() => { document.documentElement.setAttribute('data-theme', 'dark'); });
  await send('Emulation.setDeviceMetricsOverride', { width: 375, height: 812, deviceScaleFactor: 1, mobile: true });
  await wait(300);
  await ev(() => document.getElementById('drawx').click());
  await openFor('Seohyun Pyo');
  await ev(() => { document.querySelectorAll('#drawb details.dqd').forEach((d) => { d.open = true; }); });
  await wait(300);
  const w2 = await ev(() => { const b = document.getElementById('drawb'); return { sw: b.scrollWidth, cw: b.clientWidth, page: document.documentElement.scrollWidth, iw: innerWidth }; });
  await shot('r6-phone');
  check('a phone: nothing wider than the screen (a long station scrolls inside its card)', w2.sw <= w2.cw + 1 && w2.page <= w2.iw, JSON.stringify(w2));
  check('no script error', !errors.length, errors.slice(0, 3).join(' | '));
} finally {
  ws.close(); chrome.kill();
  try { fs.rmSync(tmp, { recursive: true, force: true }); } catch {}
}
console.log(`\n${passes} passed, ${fails} failed`);
process.exit(fails ? 1 : 0);
