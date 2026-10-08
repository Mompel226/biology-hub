#!/usr/bin/env node
/* ============================================================
   tools/teacher-actions.mjs — the teacher page's actions of 6 Oct 2026: Change the due date and counting pupils into a
   homework (Set homework), and Move a pupil to another class (Students).
   (Daniel, 6 Oct 2026: "can the system change the due date … from the website and then automatically change it in
   Google Classroom?"; "the special case of these six students"; "there should be an option to move a student between
   classes … and then everything is ported".)

   The REAL apps-script/Teacher.html, in headless Chrome, with a stand-in for google.script.run: uiData('homework')
   answers two made-up homework (one posted to Classroom, one not), uiData('students') a made-up class list, and
   homeworkChangeDue / homeworkAddPupils / studentMove answer as the labs script would. It proves:
   · an open homework card has "Change the due date"; it opens boxes holding the due it has now (an end-of-day due
     leaves the time empty), and says whether Google Classroom gets the new date;
   · Save sends { id, due, time } once; the answer's note shows in that card, and the list shows the new date;
   · a refusal keeps the boxes open with what was typed, and says why in red in that card;
   · "change it in Classroom by hand" is shown in red; Cancel closes the boxes;
   · the pupils in a class now but not in its homework are listed, each saying why; the button waits for a tick, sends
     only the ticked pupils once, and the card says how many now count;
   · Students: each pupil has Move; it offers the other classes, refuses no choice in words, sends { email, cls } once,
     shows the answer and the new class, and drops the other views' kept copies (they show the class);
   · (7 Oct 2026) a pupil in LEFT … is listed last, under "In none of the classes", never as a class in the filter; Move
     offers "Left: in no class" (sent as { email, left: true }) to the others, and brings a LEFT pupil back to a class;
   · (8 Oct 2026) each pupil has Accommodation; it sends { email, on } once, the card then says "Accommodation" and the
     button "Accommodation: on" (pressed); pressed again it sends { email, on: false } and both go;
   · a phone: nothing wider than the screen; no script error.
   usage: node tools/teacher-actions.mjs [--file <a Teacher.html>] [--shots <folder>]
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

const hw = (id, title, dueText, dueDay, dueHm, inClassroom) => ({ id, title, who: '11C', what: 'Digestion: The mouth', teacher: 'teacher@x.kr', mine: true,
  pupils: [{ name: 'Rue Ha', cls: '11C', done: 3, total: 8, pct: 37, state: 'partly', last: null }], tally: { done: 0, partly: 1, none: 0 }, setCount: 1, gone: 0,
  created: '2026-10-01T00:00:00.000Z', due: '2026-10-20T14:59:59.000Z', status: 'set', reported: null, dueText, overdue: false, soon: false, dueBad: false,
  dueDay, dueHm, inClassroom, start: null, startText: '', waiting: false, tasks: [{ labId: 'digestion-lab', stationIds: ['mouth'] }], targets: { cls: '11C' }, missing: [], remind: null,
  outside: id === 'HW-A' ? [{ name: 'Late Lee', email: 'late@pupils.x.kr', late: true }, { name: 'Moved Min', email: 'moved@pupils.x.kr', late: false }] : [] });
const DIR = { students: [{ name: 'Rue Ha', cls: '11C', email: 'rue@pupils.x.kr', cohort: { grad: 2027, title: 'Class of 2027', yearGroup: 'Y11' } },
  { name: 'Ian Kwon', cls: '11D', email: 'ian@pupils.x.kr', cohort: { grad: 2027, title: 'Class of 2027', yearGroup: 'Y11' } },
  { name: 'Gone Go', cls: 'LEFT 2026', email: 'gone@pupils.x.kr', cohort: null }], classes: ['11C', '11D', '11E'] };
const DATA = { generatedAt: 't', labs: [{ id: 'digestion-lab', name: 'Digestion', topic: '7', questions: 8, stations: [{ id: 'mouth', name: 'The mouth', questions: 8 }] }],
  students: [{ name: 'Rue Ha', cls: '11C', email: 'rue@pupils.x.kr' }], classes: ['11C'], whose: 'mine', manifestOk: true, hubSet: true, english: null, writeup: null,
  classroomOk: true, remindAllowed: null,
  homework: [hw('HW-A', 'Gut practice', '20 Oct', '2026-10-20', '23:59', true), hw('HW-B', 'Teeth only', '21 Oct, 08:30', '2026-10-21', '08:30', false)] };

const STUB = `<style>*{transition:none!important;animation:none!important}</style><script>
window.__DATA = ${JSON.stringify(DATA)};
window.__SENT = []; window.__ADDED = []; window.__MOVED = [];
window.__DIR = ${JSON.stringify(DIR)};
/* ?base=1: the tracker address is set (Copy and Open tracker on every card, as on Daniel's page) and the first pupil has the
   accommodation on ("Accommodation: on", the widest button): the card-fit check below (the audit, 8 Oct 2026) */
if (/base=1/.test(location.search)) { window.__BASE = 'https://script.google.com/macros/s/AKfycbTEST/exec'; window.__DIR.students[0].acc = true;
  try { sessionStorage.clear(); } catch (e) {} }   /* the page keeps each view in sessionStorage: drop the copy without the address */
window.google = { script: {} };
Object.defineProperty(window.google.script, 'run', { get: function () {
  var s = null, p = new Proxy({}, { get: function (t, k) {
    if (k === 'withSuccessHandler') return function (f) { s = f; return p; };
    if (k === 'withFailureHandler') return function () { return p; };
    return function (a) { var ok = s;
      if (k === 'homeworkChangeDue') window.__SENT.push(a);
      if (k === 'homeworkAddPupils') window.__ADDED.push(a);
      if (k === 'studentMove') window.__MOVED.push(a);
      if (k === 'studentAccommodation') (window.__ACC = window.__ACC || []).push(a);
      setTimeout(function () { if (!ok) return;
        if (k === 'uiData') return ok(a === 'homework' ? { ok: true, data: window.__DATA } : a === 'students' ? { ok: true, data: window.__DIR, trackerBase: window.__BASE || '' } : { ok: false, why: 'not in this check' });
        if (k === 'homeworkAddPupils') {
          var d2 = JSON.parse(JSON.stringify(window.__DATA));
          d2.homework.forEach(function (h) { if (h.id === a.id) { h.outside = h.outside.filter(function (p) { return a.emails.indexOf(p.email) < 0; });
            a.emails.forEach(function (e) { h.pupils.push({ name: e === 'late@pupils.x.kr' ? 'Late Lee' : e, cls: '11C', done: 0, total: 8, pct: 0, state: 'none', last: null }); }); } });
          window.__DATA = d2;
          return ok({ ok: true, note: a.emails.length + ' pupil of 11C now counts in this homework.', data: d2 });
        }
        if (k === 'studentMove') {
          var d3 = JSON.parse(JSON.stringify(window.__DIR));
          var who = '';
          d3.students.forEach(function (p) { if (p.email === a.email) { who = p.name; p.cls = a.left ? 'LEFT 2026' : a.cls; p.cohort = a.left ? null : p.cohort; } });
          window.__DIR = d3;
          return ok({ ok: true, note: a.left ? who + ' is in none of the classes now (LEFT 2026). Their records stay.'
                                             : who + ' moved to ' + a.cls + '. Their homework and work go with them. Move them in Google Classroom too.', data: d3, trackerBase: '' });
        }
        if (k === 'studentAccommodation') {
          var d4 = JSON.parse(JSON.stringify(window.__DIR)), nm = '';
          d4.students.forEach(function (p) { if (p.email === a.email) { nm = p.name; if (a.on) p.acc = true; else delete p.acc; } });
          window.__DIR = d4;
          return ok({ ok: true, note: a.on ? nm + ' has the accommodation now.' : nm + ' has no accommodation now.', data: d4, trackerBase: '' });
        }
        if (k === 'homeworkChangeDue') {
          if (a.due < '2026-10-07') return ok({ ok: false, why: 'The new due time (5 Oct, 23:59) has passed. Choose a later one.' });
          var d = JSON.parse(JSON.stringify(window.__DATA));
          d.homework.forEach(function (h) { if (h.id === a.id) { h.dueDay = a.due; h.dueHm = a.time || '23:59'; h.dueText = '27 Oct' + (a.time ? ', ' + a.time : ''); } });
          window.__DATA = d;
          return ok({ ok: true, note: a.id === 'HW-B' ? 'It is now due 27 Oct, 09:00 here, but Google Classroom did not take it (a test). Change the due date in Classroom ▸ Classwork by hand.'
                                                     : 'It is now due 27 Oct, 09:00, here and in Google Classroom.', data: d });
        }
        ok({ ok: false }); }, 40); };
  } });
  return p;
} });
</script>`;

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'teacher-due-'));
const page = (tab = 'homework') => {
  const f = path.join(tmp, tab + '.html');
  fs.writeFileSync(f, fs.readFileSync(FILE, 'utf8')
    .replace('__BOOT__', () => JSON.stringify({ email: 'teacher@x.kr', tab, analysis: '', hub: '' }))
    .replace(/<head>/i, (m) => m + STUB));
  return 'file://' + f;
};
const port = 9600 + (process.pid % 90);
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
const card = (id) => ev((i) => { const h = document.querySelector('.hw__h[data-hw="' + i + '"]'); const c = h && h.closest('.hw'); return c ? c.textContent.replace(/\s+/g, ' ') : ''; }, id);
/* opens a homework card, leaving it open if it already is (a click on its head closes it) */
const open = (id) => ev((i) => { const h = document.querySelector('.hw__h[data-hw="' + i + '"]'); if (h.getAttribute('aria-expanded') !== 'true') h.click(); }, id);
const press = (sel) => ev((s) => { const b = document.querySelector(s); if (b) b.click(); return !!b; }, sel);

try {
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: page() });
  check('the homework list draws', await until(() => document.querySelectorAll('.hw__h').length === 2), 'no homework after 6 s');
  await open('HW-A');
  check('an open card has “Change the due date”', await until(() => !!document.querySelector('[data-duechg="HW-A"]')), await card('HW-A'));
  await press('[data-duechg="HW-A"]');
  let f = await ev(() => ({ d: document.getElementById('dd-HW-A') && document.getElementById('dd-HW-A').value, t: document.getElementById('dt-HW-A') && document.getElementById('dt-HW-A').value,
    words: (document.querySelector('.duechg') || {}).textContent || '', focus: document.activeElement && document.activeElement.id }));
  check('it opens boxes holding the due it has now (the end of the day leaves the time empty), and the date box has the focus', f.d === '2026-10-20' && f.t === '' && f.focus === 'dd-HW-A', JSON.stringify(f));
  check('it says Google Classroom gets the new date, and what happens to reminders', /Google Classroom assignment gets the new date too/.test(f.words) && /Reminders already sent are not sent again/.test(f.words), f.words);
  await shot('1-boxes');
  await ev(() => { const d = document.getElementById('dd-HW-A'), t = document.getElementById('dt-HW-A');
    d.value = '2026-10-05'; d.dispatchEvent(new Event('input')); t.value = '09:00'; t.dispatchEvent(new Event('input')); });
  await press('[data-duesave="HW-A"]');
  await until(() => /has passed/.test(document.querySelector('.hw__h[data-hw="HW-A"]').closest('.hw').textContent));
  f = await ev(() => ({ d: document.getElementById('dd-HW-A') && document.getElementById('dd-HW-A').value, t: document.getElementById('dt-HW-A') && document.getElementById('dt-HW-A').value,
    msg: (document.querySelector('.hw .msg.bad') || {}).textContent || '' }));
  check('a refusal keeps the boxes open with what was typed, and says why in red in that card', f.d === '2026-10-05' && f.t === '09:00' && /has passed/.test(f.msg), JSON.stringify(f));
  await ev(() => { const d = document.getElementById('dd-HW-A'); d.value = '2026-10-27'; d.dispatchEvent(new Event('input')); });
  await press('[data-duesave="HW-A"]');
  check('Save: the note shows in that card, and the list shows the new date',
    await until(() => { const c = document.querySelector('.hw__h[data-hw="HW-A"]').closest('.hw'); return /here and in Google Classroom/.test(c.textContent) && /27 Oct, 09:00/.test(c.textContent) && !document.getElementById('dd-HW-A'); }),
    await card('HW-A'));
  const sent = await ev(() => window.__SENT);
  check('the page sent { id, due, time } each time Save was pressed, nothing else', JSON.stringify(sent) === JSON.stringify([{ id: 'HW-A', due: '2026-10-05', time: '09:00' }, { id: 'HW-A', due: '2026-10-27', time: '09:00' }]), JSON.stringify(sent));
  check('the good news is not red', await ev(() => !!document.querySelector('.hw .msg.ok')), 'no green message');
  await shot('2-saved');

  await open('HW-B');
  await until(() => !!document.querySelector('[data-duechg="HW-B"]'));
  await press('[data-duechg="HW-B"]');
  f = await ev(() => ({ t: document.getElementById('dt-HW-B').value, words: document.querySelector('.duechg').textContent }));
  check('a homework never posted says only this list changes; a set time is in the box', f.t === '08:30' && /not posted to Google Classroom/.test(f.words), JSON.stringify(f));
  await press('[data-duecancel]');
  check('Cancel closes the boxes', await until(() => !document.getElementById('dd-HW-B')), 'still open');
  await press('[data-duechg="HW-B"]');
  await ev(() => { const t = document.getElementById('dt-HW-B'); t.value = '09:00'; t.dispatchEvent(new Event('input')); });
  await press('[data-duesave="HW-B"]');
  check('“change it in Classroom by hand” is shown in red', await until(() => /by hand/.test((document.querySelector('.hw .msg.bad') || {}).textContent || '')), await card('HW-B'));

  console.log('\npupils outside a homework');
  await open('HW-A');
  await until(() => !!document.querySelector('.outside'));
  let o = await ev(() => ({ txt: document.querySelector('.outside').textContent.replace(/\s+/g, ' '), dis: document.getElementById('outadd-HW-A').disabled }));
  check('the pupils in 11C now but not in it are listed, each saying why, under words saying it does not count for them',
    /In 11C now, not in this homework, so it does not count for them/.test(o.txt) && /Late Lee · came onto the Students tab after it was set/.test(o.txt) &&
    /Moved Min · was in another class when it was set/.test(o.txt), o.txt);
  check('the button waits for a tick', o.dis === true, 'enabled with nothing ticked');
  await ev(() => { const i = document.querySelector('[data-outpick="HW-A"][value="late@pupils.x.kr"]'); i.checked = true; i.dispatchEvent(new Event('change')); });
  check('a tick turns it on', await ev(() => !document.getElementById('outadd-HW-A').disabled), 'still disabled');
  await press('#outadd-HW-A');
  check('only the ticked pupil is sent, once, and the card says how many now count',
    await until(() => /1 pupil of 11C now counts in this homework/.test((document.querySelector('.hw .msg.ok') || {}).textContent || '')), await card('HW-A'));
  o = await ev(() => ({ sent: window.__ADDED, txt: (document.querySelector('.outside') || {}).textContent || '' }));
  check('the list is drawn again from the answer', JSON.stringify(o.sent) === JSON.stringify([{ id: 'HW-A', emails: ['late@pupils.x.kr'] }]) && !/Late Lee/.test(o.txt) && /Moved Min/.test(o.txt), JSON.stringify(o));
  await shot('4-outside');

  console.log('\nMove (Students)');
  await send('Page.navigate', { url: page('students') });
  check('the Students tab draws, with Move on each pupil', await until(() => document.querySelectorAll('[data-mv]').length === 3), 'no Move buttons');
  const g = await ev(() => ({ heads: [...document.querySelectorAll('#slist2 .coh__t')].map((x) => x.textContent),
    last: [...document.querySelectorAll('#slist2 .grp')].pop().textContent, filter: [...document.querySelectorAll('#tc option')].map((x) => x.value) }));
  check('a pupil in LEFT is listed last, under "In none of the classes", and LEFT is never a class in the filter',
    g.heads[g.heads.length - 1] === 'In none of the classes' && /Gone Go/.test(g.last) && /LEFT 2026/.test(g.last) && g.filter.indexOf('LEFT 2026') < 0 && g.filter.indexOf('11C') > 0, JSON.stringify(g));
  await ev(() => { try { sessionStorage.setItem('teach.progress', JSON.stringify({ at: Date.now(), r: { ok: true, data: {} } })); } catch (e) {} });
  await press('[data-mv="rue@pupils.x.kr"]');
  let m = await ev(() => ({ opts: [...document.querySelectorAll('#mv-to option')].map((x) => x.value), focus: document.activeElement && document.activeElement.id }));
  check('Move offers the other classes, never their own, then "Left: in no class"; the box has the focus', JSON.stringify(m.opts) === JSON.stringify(['', '11D', '11E', '__left']) && m.focus === 'mv-to', JSON.stringify(m));
  await press('[data-mvgo="rue@pupils.x.kr"]');
  check('no class chosen: said in words, nothing sent', await until(() => /Choose the class/.test(document.getElementById('slist2').textContent)) && (await ev(() => window.__MOVED.length)) === 0, 'sent or silent');
  check('after that, the box stays open for a choice', await ev(() => !!document.getElementById('mv-to')), 'it closed');
  await ev(() => { const s = document.getElementById('mv-to'); s.value = '11D'; s.dispatchEvent(new Event('change')); });
  await press('[data-mvgo="rue@pupils.x.kr"]');
  check('Move sends { email, cls } once, says what happened and that Classroom is the teacher’s, and the card shows the new class',
    await until(() => /moved to 11D/.test(document.getElementById('slist2').textContent) && /Google Classroom/.test(document.getElementById('slist2').textContent)) &&
    JSON.stringify(await ev(() => window.__MOVED)) === JSON.stringify([{ email: 'rue@pupils.x.kr', cls: '11D' }]) &&
    await ev(() => [...document.querySelectorAll('.card')].some((c) => /Rue Ha/.test(c.textContent) && /11D/.test(c.textContent))), await ev(() => document.getElementById('slist2').textContent.slice(0, 300)));
  check('the other views’ kept copies are dropped, so they show the new class', await ev(() => { try { return !sessionStorage.getItem('teach.progress'); } catch (e) { return false; } }), 'teach.progress is still kept');
  await shot('5-moved');
  await press('[data-mv="ian@pupils.x.kr"]');
  await press('[data-mvno]');
  check('Cancel closes it', await until(() => !document.getElementById('mv-to')), 'still open');
  await press('[data-mv="ian@pupils.x.kr"]');
  await ev(() => { const s = document.getElementById('mv-to'); s.value = '__left'; s.dispatchEvent(new Event('change')); });
  await press('[data-mvgo="ian@pupils.x.kr"]');
  check('"Left: in no class" sends { email, left: true } once, and the pupil moves to the last group',
    await until(() => /Ian Kwon is in none of the classes now/.test(document.getElementById('slist2').textContent)) &&
    JSON.stringify(await ev(() => window.__MOVED.filter((x) => x.email === 'ian@pupils.x.kr'))) === JSON.stringify([{ email: 'ian@pupils.x.kr', left: true }]) &&
    await ev(() => /Ian Kwon/.test([...document.querySelectorAll('#slist2 .grp')].pop().textContent)), await ev(() => document.getElementById('slist2').textContent.slice(0, 300)));
  await press('[data-mv="gone@pupils.x.kr"]');
  m = await ev(() => [...document.querySelectorAll('#mv-to option')].map((x) => x.value));
  check('a pupil in LEFT is offered every class, and not "Left" again', JSON.stringify(m) === JSON.stringify(['', '11C', '11D', '11E']), JSON.stringify(m));
  await ev(() => { const s = document.getElementById('mv-to'); s.value = '11C'; s.dispatchEvent(new Event('change')); });
  await press('[data-mvgo="gone@pupils.x.kr"]');
  check('…and Move brings them back to a class', await until(() => /Gone Go moved to 11C/.test(document.getElementById('slist2').textContent)) &&
    JSON.stringify(await ev(() => window.__MOVED.filter((x) => x.email === 'gone@pupils.x.kr'))) === JSON.stringify([{ email: 'gone@pupils.x.kr', cls: '11C' }]), await ev(() => document.getElementById('slist2').textContent.slice(0, 300)));
  await shot('6-left-group');
  /* the Accommodation (8 Oct 2026) */
  check('each pupil has an Accommodation button, off', await ev(() => [...document.querySelectorAll('[data-acc]')].length === 3 && [...document.querySelectorAll('[data-acc]')].every((b) => b.getAttribute('aria-pressed') === 'false')), 'buttons: ' + await ev(() => document.querySelectorAll('[data-acc]').length));
  await press('[data-acc="rue@pupils.x.kr"]');
  check('Accommodation sends { email, on: true } once; the card says so and the button reads "Accommodation: on", pressed',
    await until(() => /has the accommodation now/.test(document.getElementById('slist2').textContent)) &&
    JSON.stringify(await ev(() => window.__ACC)) === JSON.stringify([{ email: 'rue@pupils.x.kr', on: true }]) &&
    await ev(() => { const b = document.querySelector('[data-acc="rue@pupils.x.kr"]'), c = b.closest('.card'); return b.getAttribute('aria-pressed') === 'true' && b.textContent === 'Accommodation: on' && /Accommodation/.test(c.querySelector('.card__d').textContent); }),
    await ev(() => document.getElementById('slist2').textContent.slice(0, 300)));
  await press('[data-acc="rue@pupils.x.kr"]');
  check('pressed again it sends { email, on: false }, and the card and button go back',
    await until(() => /has no accommodation now/.test(document.getElementById('slist2').textContent)) &&
    JSON.stringify(await ev(() => window.__ACC.slice(1))) === JSON.stringify([{ email: 'rue@pupils.x.kr', on: false }]) &&
    await ev(() => { const b = document.querySelector('[data-acc="rue@pupils.x.kr"]'); return b.getAttribute('aria-pressed') === 'false' && b.textContent === 'Accommodation' && !/Accommodation/.test(b.closest('.card').querySelector('.card__d').textContent); }),
    await ev(() => JSON.stringify(window.__ACC)));

  /* every pupil card fits, with Copy, Open tracker, Move and Accommodation (the audit, 8 Oct 2026: names ran one letter per
     line and the buttons stood out of the card at every width; on a phone the page scrolled sideways) */
  for (const wd of [1440, 1280, 375]) {
    await send('Emulation.setDeviceMetricsOverride', { width: wd, height: 900, deviceScaleFactor: 1, mobile: wd < 768 });
    await send('Page.navigate', { url: page('students') + '?base=1' });
    await until(() => document.querySelectorAll('[data-acc]').length === 3);
    const fit = await ev(() => ({ sw: document.documentElement.scrollWidth, iw: innerWidth,
      cards: [...document.querySelectorAll('.cards--wide .card')].map((c) => { const r = c.getBoundingClientRect(), a = c.querySelector('.card__a').getBoundingClientRect(), n = c.querySelector('.card__n').getBoundingClientRect();
        return { name: c.querySelector('.card__n').textContent, out: Math.round(a.right - r.right), nameW: Math.round(n.width), copy: !!c.querySelector('[data-copy]') }; }) }));
    check(wd + ' px: every pupil card holds its four buttons and a readable name (tracker address set, one pupil on)',
      fit.cards.length === 3 && fit.cards.every((c) => c.out <= 1 && c.nameW >= 60 && c.copy) && fit.sw <= fit.iw, JSON.stringify(fit));
    if (wd === 1280) await shot('7-students-fit');
  }
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });

  await send('Page.navigate', { url: page('homework') });
  await until(() => document.querySelectorAll('.hw__h').length === 2);
  await open('HW-B');
  await until(() => !!document.querySelector('[data-duechg="HW-B"]'));
  await send('Emulation.setDeviceMetricsOverride', { width: 375, height: 812, deviceScaleFactor: 1, mobile: true });
  await press('[data-duechg="HW-B"]');
  await wait(300);
  const w = await ev(() => ({ sw: document.documentElement.scrollWidth, iw: innerWidth, open: !!document.getElementById('dd-HW-B') }));
  await shot('3-phone');
  check('a phone: the boxes open, nothing wider than the screen', w.open && w.sw <= w.iw, JSON.stringify(w));
  check('no script error', !errors.length, errors.slice(0, 3).join(' | '));
} finally {
  ws.close(); chrome.kill();
  try { fs.rmSync(tmp, { recursive: true, force: true }); } catch {}
}
console.log(`\n${passes} passed, ${fails} failed`);
process.exit(fails ? 1 : 0);
