/* ============================================================
   analysis.js — the private analysis page.
   Plan: docs/analysis-site/PLAN.md (approved by Daniel, 1 Oct 2026).

   The page holds NO data. After a sign-in (the website's one sign-in, js/signin.js) it asks the
   Student Progress Tracker's own script, which checks the Google sign-in and its list of viewers
   and only then reads the tracker. Everything below works on what that answer carries, in this
   tab only: nothing is written to localStorage or sessionStorage (the only key on the site is
   signin.js's own), the data is wiped when the tab is hidden for good (pagehide), and after 20
   minutes without a click.

   Three parts:
     1. THE SUMS — pure functions. The harness (check_analysis_sums.mjs) runs them in node beside
        the reflection's own (_scoreKind_, _aggregateTopicPerf, _aggregateCmdPerf,
        _aggregateErrorProfile, _aggregateMcqWrong, _gradeByPcts_) on the same rows; they agree,
        apart from the deliberate changes PLAN.md lists, which it asserts one by one.
     2. THE DRAWING — plain SVG strings, also pure (tools/test-balance.mjs draws with them).
     3. THE PAGE — only in a browser.
   ============================================================ */
(function (root) {
  'use strict';
  var Balance = root.Balance || (typeof require === 'function' ? require('./balance.js') : null);

  /* =====================================================================================================
     1. THE SUMS
     ===================================================================================================== */
  var GRADES = ['A*', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'U'];             // the reflection's _RA_BOUND_GRADE_ORDER
  var DEFAULT_PCTS = [82.5, 69, 57.5, 47.5, 37.5, 32.5, 25, 21.5, 0];      // _RA_BOUND_DEFAULT_PCTS
  var BOUND_GRADES = ['A*', 'A', 'B', 'C', 'D', 'E'];                      // the seven NLCS grades: these, then U
  /* ERROR_CODES in the reflection's 2_Registry.gs: the same letters in the same order */
  var ERR = [
    { c: 'K', e: '🧠', l: 'Knowledge gap', d: 'did not know this biology' },
    { c: 'L', e: '🔗', l: 'Linked concept', d: 'knew the parts but could not link the steps' },
    { c: 'V', e: '📝', l: 'Vocabulary', d: 'used everyday words instead of the keyword' },
    { c: 'W', e: '✍️', l: 'Wordy', d: 'wrote too much; padding cost marks or time' },
    { c: 'E', e: '🇬🇧', l: 'English / clarity', d: 'sentences unclear to the examiner' },
    { c: 'C', e: '📖', l: 'Command word', d: 'answered in the wrong style for the command word' },
    { c: 'T', e: '⏱️', l: 'Time', d: 'ran out of time or rushed' },
    { c: 'S', e: '🤦', l: 'Slip / careless', d: 'knew it, made a silly mistake' }];
  /* the revision-timing answers of the reflection form, as the old tab matched them (TIMING_MAP) */
  var TIMING = [['Consistently throughout the year', 'All through the year'], ['Mainly in the weeks before the exam', 'In the weeks before'],
    ['Only shortly before the exam', 'Only just before'], ['Very little revision', 'Very little'], ['Other', 'Other']];

  /* _scoreKind_ (reflection §40.101): teacher | partly | self */
  function kindOf(src) {
    var o = src;
    if (typeof o === 'string') {
      var t = o.trim();
      if (!t) return 'teacher';
      if (t.charAt(0) !== '{') return (t === 'self' || t === 'none') ? 'self' : 'teacher';
      try { o = JSON.parse(t); } catch (e) { return 'teacher'; }
    }
    if (!o || typeof o !== 'object' || !o.overall) return 'teacher';
    if (o.overall !== 'teacher') return 'self';
    return o.questions === 'self' ? 'partly' : 'teacher';
  }
  /* _gradeByPcts_: the grade a percentage earns on a list of minima (null: not on that scale) */
  function gradeOf(pct, pcts) {
    if (pct === null || pct === undefined || isNaN(pct)) return null;
    pcts = pcts || DEFAULT_PCTS;
    for (var i = 0; i < GRADES.length - 1; i++) if (pcts[i] !== null && pcts[i] !== undefined && pct >= pcts[i]) return GRADES[i];
    return GRADES[GRADES.length - 1];
  }
  function num(v) { return v === '' || v === null || v === undefined ? NaN : parseFloat(v); }
  function pctOf(r) { var sc = num(r.s[0]), mx = num(r.s[1]); return mx > 0 && !isNaN(sc) ? sc / mx * 100 : null; }
  function mean(a) { return a.length ? a.reduce(function (x, y) { return x + y; }, 0) / a.length : null; }
  function rnd(x) { return x === null || x === undefined || isNaN(x) ? '—' : String(Math.round(x)); }
  function pl(n, one, many) { return n + ' ' + (n === 1 ? one : (many || one + 's')); }
  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
  var MONTHS = 'JanFebMarAprMayJunJulAugSepOctNovDec';
  /* day first, as the tracker stores it ("22 Sep 2026"); never new Date(text), which reads the month first */
  function parseDay(s) {
    var t = String(s == null ? '' : s).trim(), m = /^(\d{1,2})\s+([A-Za-z]{3})[a-z]*\.?\s+(\d{4})/.exec(t);
    if (m) { var mo = MONTHS.indexOf(m[2].charAt(0).toUpperCase() + m[2].slice(1, 3).toLowerCase()); if (mo >= 0 && mo % 3 === 0) return new Date(+m[3], mo / 3, +m[1]).getTime(); }
    m = /^(\d{4})-(\d{2})-(\d{2})/.exec(t);
    return m ? new Date(+m[1], +m[2] - 1, +m[3]).getTime() : 0;
  }
  /* _aggregateErrorProfile: "K,L,V,W,E,C,T,S"; an old 5-place row is K,L,V,C,T */
  function errorCounts(e) {
    var out = [0, 0, 0, 0, 0, 0, 0, 0], raw = String(e == null ? '' : e).trim();
    if (!raw) return out;
    var p = raw.split(',');
    if (p.length >= 8) for (var i = 0; i < 8; i++) out[i] = parseInt(p[i], 10) || 0;
    else { out[0] = parseInt(p[0], 10) || 0; out[1] = parseInt(p[1], 10) || 0; out[2] = parseInt(p[2], 10) || 0; out[5] = parseInt(p[3], 10) || 0; out[6] = parseInt(p[4], 10) || 0; }
    return out;
  }
  function normCls(s) { return String(s == null ? '' : s).trim().toUpperCase().replace(/\s/g, ''); }

  /* ---------- what the server sent, made ready ---------- */
  function famKey(D, id) { var e = D.reg[id]; return e ? (e.fam || id) + '|' + (e.ay || '') : String(id) + '|'; }
  function famFor(D, key, id) {
    var e = D.reg[id] || null;
    var ids = e ? Object.keys(D.reg).filter(function (k) { return famKey(D, k) === key; })
      .sort(function (a, b) { return String(D.reg[a].ver).localeCompare(String(D.reg[b].ver)) || a.localeCompare(b); }) : [String(id)];
    return { key: key, ids: ids, name: e ? String(e.name || id) : String(id), short: e ? String(e.label || e.name || id) : String(id), type: e ? String(e.type || '') : '', yg: e ? +e.yg || 0 : 0,
             ay: e ? String(e.ay || '') : '', tabs: [], seen: [], day: 0 };
  }
  function gradOf(ay, yg) { var y = parseInt(String(ay || ''), 10); return y && yg ? y + 1 + (11 - yg) : 0; }
  function prepare(P) {
    var D = { year: String(P.year || ''), newest: String(P.newest || ''), reg: {}, fams: {}, rows: [], classes: P.classes || {}, genders: {},
              bounds: P.bounds || {}, maps: P.maps || {}, reports: P.reports || {}, topics: P.topics || {}, tabs: [] };
    (P.registry || []).forEach(function (e) { D.reg[e.id] = e; });
    Object.keys(P.genders || {}).forEach(function (c) { D.genders[normCls(c)] = P.genders[c]; });
    var tabs = {};
    Object.keys(D.classes).forEach(function (t) { tabs[t] = 1; });
    (P.rows || []).forEach(function (r) {
      r.k = famKey(D, r.a); r.day = parseDay(r.d);
      var f = D.fams[r.k] || (D.fams[r.k] = famFor(D, r.k, r.a));
      if (f.tabs.indexOf(r.t) < 0) f.tabs.push(r.t);
      if (f.seen.indexOf(r.a) < 0) f.seen.push(r.a);
      if (r.day && (!f.day || r.day < f.day)) f.day = r.day;
      tabs[r.t] = 1; D.rows.push(r);
    });
    D.tabs = Object.keys(tabs).filter(function (t) { return /^Class of \d{4}$/.test(t); }).sort(function (a, b) { return +a.slice(-4) - +b.slice(-4); });
    return D;
  }
  function yearOfTab(D, tab) { var y = parseInt(D.year, 10); return y ? 11 - (+String(tab).slice(-4) - (y + 1)) : null; }
  function famsOfTab(D, tab) {
    return Object.keys(D.fams).map(function (k) { return D.fams[k]; }).filter(function (f) { return f.tabs.indexOf(tab) >= 0; })
      .sort(function (a, b) { return (a.day || 9e15) - (b.day || 9e15) || a.name.localeCompare(b.name); });
  }
  function topicLabel(D, k) {
    var n = String(D.topics[k] || '').trim();
    if (!n) return String(k) === 'AO3' ? 'AO3 Practical skills' : 'Topic ' + k;
    return n.indexOf(String(k)) === 0 ? n : k + ' ' + n;
  }

  /* Each paper's grade boundaries, in this order (PLAN.md question 9: one home, three doors):
     the numbers being tried in the editor (a preview nobody else sees); the home, the tracker's 🎯 Grade boundaries
     tab; the mirror, the 📦 Registry's GradeBoundariesJSON (what older reflection copies store); the default IGCSE ones. */
  function okSet(p) { return Array.isArray(p) && p.length === 6 && p.every(function (x) { return typeof x === 'number' && !isNaN(x); }); }
  function boundsFor(D, id, preview) {
    if (preview && preview.vals && okSet(preview.vals[id])) return { src: 'preview', pcts: preview.vals[id].concat([null, null, 0]) };
    var h = D.bounds[id];
    if (h && okSet(h.p)) return { src: 'home', pcts: h.p.concat([null, null, 0]), by: h.by || '', at: h.at || '', door: h.door || '' };
    var e = D.reg[id];
    if (e && okSet(e.gb)) return { src: 'mirror', pcts: e.gb.concat([null, null, 0]) };
    return { src: 'default', pcts: DEFAULT_PCTS.slice() };
  }

  /* Which classes have data, assessment by assessment (Daniel's rule, 1 Oct: incomplete data is shown, never hidden).
     The classes are the ones the tracker has seen in this year group, with the pupils seen in each. */
  function coverage(D, tab, rows, classes, keys, own) {
    var roster = D.classes[tab] || {}, cells = {}, has = {};
    classes.forEach(function (c) { cells[c] = {}; keys.forEach(function (k) { cells[c][k] = { roster: +roster[c] || 0, marked: 0, own: 0 }; }); });
    rows.forEach(function (r) { var x = cells[r.c] && cells[r.c][r.k]; if (!x) return; if (kindOf(r.src) === 'self') x.own++; else x.marked++; });
    classes.forEach(function (c) { has[c] = keys.some(function (k) { var x = cells[c][k]; return x.marked + (own ? x.own : 0) > 0; }); });
    var withData = classes.filter(function (c) { return has[c]; }), gaps = [];
    withData.forEach(function (c) {
      keys.forEach(function (k) {
        var x = cells[c][k], nm = D.fams[k] ? D.fams[k].name : k;
        if (!x.marked && !x.own) gaps.push(c + ' has not started ' + nm);
        else if (!x.marked && !own) gaps.push(c + '’s ' + nm + ' is not marked yet');
      });
    });
    return { cells: cells, classes: classes, keys: keys, has: has, withData: withData, missing: classes.filter(function (c) { return !has[c]; }), gaps: gaps, roster: roster };
  }

  function analyse(D, rows, own, preview) {
    function counts(r) { return own || kindOf(r.src) !== 'self'; }
    var counted = rows.filter(counts), k = { teacher: 0, partly: 0, self: 0 };
    rows.forEach(function (r) { k[kindOf(r.src)]++; });
    var keySet = {}, idSet = {};
    rows.forEach(function (r) { keySet[r.k] = 1; idSet[r.a] = 1; });
    var keys = Object.keys(keySet).sort(function (x, y) { return ((D.fams[x] || {}).day || 9e15) - ((D.fams[y] || {}).day || 9e15) || String(x).localeCompare(String(y)); });
    var out = { rows: rows, counted: counted, kinds: k, keys: keys, ids: Object.keys(idSet), own: !!own, pupils: {} };
    rows.forEach(function (r) { out.pupils[r.p] = 1; });
    out.nPupils = Object.keys(out.pupils).length;

    /* the mean: the mean of each paper's own percentage (the old tab averaged raw marks across papers with different totals) */
    var pcts = counted.map(pctOf).filter(function (x) { return x !== null; });
    out.meanPct = mean(pcts); out.nScored = pcts.length;
    /* grades: each paper on its own assessment version's boundaries */
    var gc = {}, used = {}; GRADES.forEach(function (g) { gc[g] = 0; });
    counted.forEach(function (r) { var p = pctOf(r); if (p === null) return; var b = boundsFor(D, r.a, preview); used[r.a] = b.src; gc[gradeOf(p, b.pcts)]++; });
    out.grades = gc; out.boundsUsed = used;
    out.cOrBetter = pcts.length ? (gc['A*'] + gc.A + gc.B + gc.C) / pcts.length * 100 : null;

    /* the parts of the paper: the mean of each paper's own percentage; Section B and C apart only when both exist */
    function part(i, j) { var a = []; counted.forEach(function (r) { var sc = num(r.s[i]), mx = num(r.s[j]); if (!isNaN(sc) && !isNaN(mx) && mx > 0) a.push(sc / mx * 100); }); return a; }
    var pM = part(2, 3), pW = part(4, 5), pB = part(6, 7), pC = part(8, 9);
    var wLabel = pB.length && pC.length ? 'Written (Sections B and C)' : pB.length ? 'Written (Section B)' : pC.length ? 'Written (Section C)' : 'Written';
    out.sections = [{ l: 'Multiple choice (Section A)', v: mean(pM), n: pM.length }, { l: wLabel, v: mean(pW), n: pW.length }]
      .concat(pB.length && pC.length ? [{ l: 'Section B', v: mean(pB), n: pB.length }, { l: 'Section C', v: mean(pC), n: pC.length }] : [])
      .filter(function (s) { return s.v !== null; });

    /* topics: multiple-choice and written marks together (_aggregateTopicPerf), hardest first */
    var tp = {};
    counted.forEach(function (r) {
      Object.keys(r.tp || {}).forEach(function (t) {
        var x = r.tp[t] || [], y = tp[t] || (tp[t] = { s: 0, a: 0, ws: 0, wa: 0, ms: 0, ma: 0, n: 0 });
        y.ws += +x[0] || 0; y.wa += +x[1] || 0; y.ms += +x[2] || 0; y.ma += +x[3] || 0;
        y.s += (+x[0] || 0) + (+x[2] || 0); y.a += (+x[1] || 0) + (+x[3] || 0); y.n++;
      });
    });
    out.topics = Object.keys(tp).map(function (t) { var x = tp[t]; return { k: t, l: topicLabel(D, t), v: x.a ? x.s / x.a * 100 : 0, w: x.wa ? x.ws / x.wa * 100 : null, m: x.ma ? x.ms / x.ma * 100 : null, n: x.n, s: x.s, a: x.a }; })
      .sort(function (a, b) { return a.v - b.v || a.k.localeCompare(b.k); });

    /* command words (_aggregateCmdPerf), hardest first */
    var cp = {};
    counted.forEach(function (r) { Object.keys(r.cp || {}).forEach(function (c) { var x = r.cp[c] || [], y = cp[c] || (cp[c] = { s: 0, a: 0, n: 0 }); y.s += +x[0] || 0; y.a += +x[1] || 0; y.n++; }); });
    out.cmds = Object.keys(cp).map(function (c) { return { l: c, v: cp[c].a ? cp[c].s / cp[c].a * 100 : 0, n: cp[c].n, s: cp[c].s, a: cp[c].a }; })
      .sort(function (a, b) { return a.v - b.v || a.l.localeCompare(b.l); });

    /* multiple choice: one paper version → by question, out of the pupils whose answers were recorded
       (_aggregateMcqWrong); several → by topic, out of all the answers on that topic. The old tab divided wrong
       answers by pupils there, which can pass 100 %. */
    var mcqIds = {}, den = 0, byQ = {}, labQ = {};
    counted.forEach(function (r) {
      var w = r.mw;
      if (Array.isArray(w)) { den++; mcqIds[r.a] = 1; w.forEach(function (x) { var q = String((x && x[0]) || '').trim(); if (!q) return; byQ[q] = (byQ[q] || 0) + 1; if (x[1] && !labQ[q]) labQ[q] = String(x[1]); }); }
      else if (w && typeof w === 'object' && Object.keys(w).length) { den++; mcqIds[r.a] = 1; Object.keys(w).forEach(function (q) { if (w[q]) byQ[q] = (byQ[q] || 0) + 1; }); }
    });
    out.mcqDen = den; out.mcqByTopic = Object.keys(mcqIds).length > 1;
    if (out.mcqByTopic) {
      var mt = {};
      counted.forEach(function (r) { Object.keys(r.tp || {}).forEach(function (t) { var x = r.tp[t] || [], a = +x[3] || 0; if (!a) return; var y = mt[t] || (mt[t] = { w: 0, n: 0 }); y.w += a - (+x[2] || 0); y.n += a; }); });
      out.mcq = Object.keys(mt).map(function (t) { return { l: topicLabel(D, t), v: mt[t].w / mt[t].n * 100, c: mt[t].w, of: mt[t].n }; });
    } else {
      out.mcq = Object.keys(byQ).map(function (q) { return { l: 'Question A' + q, sub: labQ[q] || '', v: den ? byQ[q] / den * 100 : 0, c: byQ[q] }; });
    }
    out.mcq.sort(function (a, b) { return b.v - a.v || String(a.l).localeCompare(String(b.l), undefined, { numeric: true }); });
    out.mcq = out.mcq.slice(0, 10);

    /* the pupils' own reasons for lost marks: every reflection counts */
    var et = [0, 0, 0, 0, 0, 0, 0, 0];
    rows.forEach(function (r) { errorCounts(r.e).forEach(function (x, i) { et[i] += x; }); });
    var esum = et.reduce(function (a, b) { return a + b; }, 0);
    out.errors = ERR.map(function (e, i) { return { c: e.c, l: e.e + ' ' + e.l, sub: e.d, v: esum ? et[i] / esum * 100 : 0, n: et[i] }; })
      .sort(function (a, b) { return b.v - a.v; });
    out.errTotal = esum;

    /* keywords pupils flagged (📚 Vocab Heatmap): each pupil's paper counted once */
    var terms = {}, subs = {};
    rows.forEach(function (r) {
      var key = r.p + '|' + r.a; subs[key] = 1;
      var v = r.v || {};
      (v.dk || []).forEach(function (w) { w = String(w || '').trim(); if (!w) return; var x = terms[w] || (terms[w] = { dk: {}, pa: {} }); x.dk[key] = 1; });
      (v.pa || []).forEach(function (w) { w = String(w || '').trim(); if (!w) return; var x = terms[w] || (terms[w] = { dk: {}, pa: {} }); x.pa[key] = 1; });
    });
    var nSubs = Object.keys(subs).length;
    out.vocab = Object.keys(terms).map(function (w) { var dk = Object.keys(terms[w].dk).length, pa = Object.keys(terms[w].pa).length; return { l: w, dk: dk, pa: pa, wt: dk + pa * 0.5, pc: nSubs ? (dk + pa) / nSubs * 100 : 0 }; })
      .sort(function (a, b) { return b.wt - a.wt || a.l.localeCompare(b.l); }).slice(0, 12);
    out.vocabSubs = nSubs;

    /* revision timing: the share counts every answer; the mean score counts papers, as a percentage (the old tab
       averaged raw marks across papers with different totals) */
    var tc = TIMING.map(function (t) { return { l: t[1], n: 0, p: [] }; }), tn = 0;
    rows.forEach(function (r) {
      var raw = String(r.rp || '').trim().toLowerCase(); if (!raw) return; tn++;
      for (var i = 0; i < TIMING.length; i++) {
        if (raw.indexOf(TIMING[i][0].toLowerCase().substring(0, 10)) >= 0) { tc[i].n++; var p = counts(r) ? pctOf(r) : null; if (p !== null) tc[i].p.push(p); return; }
      }
      tc[4].n++;
    });
    out.timing = tc.map(function (t) { return { l: t.l, share: tn ? t.n / tn * 100 : 0, n: t.n, m: mean(t.p), np: t.p.length }; }); out.timingN = tn;

    /* each pupil, assessment by assessment in date order (📈 Progression): whole percentages, the change between the
       last two, and their own forecast against the real total */
    var pp = {};
    rows.forEach(function (r) {
      var x = pp[r.p] || (pp[r.p] = { p: r.p, name: String(r.n || ''), cls: String(r.c || ''), day: 0, by: {} });
      if (r.day >= x.day) { x.day = r.day; if (r.c) x.cls = String(r.c); if (r.n) x.name = String(r.n); }
      if (x.by[r.k]) return;
      var self = kindOf(r.src) === 'self', p = pctOf(r);
      x.by[r.k] = { pct: counts(r) && p !== null ? Math.round(p) : null, wait: !counts(r), own: self, sc: num(r.s[0]), mx: num(r.s[1]), pr: r.pr };
    });
    out.progress = Object.keys(pp).map(function (c) {
      var x = pp[c], seq = keys.filter(function (k2) { return x.by[k2] && x.by[k2].pct !== null; });
      x.delta = seq.length >= 2 ? x.by[seq[seq.length - 1]].pct - x.by[seq[seq.length - 2]].pct : null;
      var last = seq.length ? x.by[seq[seq.length - 1]] : null;
      x.cal = '';
      if (last && last.pr !== '' && last.pr !== null && last.pr !== undefined && !isNaN(parseFloat(last.pr)) && !isNaN(last.sc) && last.mx) {
        var diff = last.sc - parseFloat(last.pr), tol = Math.max(2, last.mx * 0.05);
        x.cal = Math.abs(diff) <= tol ? 'Spot on' : diff > 0 ? 'Pessimistic by ' + Math.round(diff) : 'Optimistic by ' + Math.round(-diff);
      }
      return x;
    });

    /* the classes side by side (new: the old tabs never compared classes) */
    var cl = {};
    counted.forEach(function (r) {
      var p = pctOf(r); if (p === null) return;
      var x = cl[r.c] || (cl[r.c] = { l: String(r.c), p: [], cb: 0, tp: {} });
      x.p.push(p);
      var g = gradeOf(p, boundsFor(D, r.a, preview).pcts); if (g === 'A*' || g === 'A' || g === 'B' || g === 'C') x.cb++;
      Object.keys(r.tp || {}).forEach(function (t) { var y = x.tp[t] || (x.tp[t] = [0, 0]), z = r.tp[t] || []; y[0] += (+z[0] || 0) + (+z[2] || 0); y[1] += (+z[1] || 0) + (+z[3] || 0); });
    });
    out.classes = Object.keys(cl).sort().map(function (c) { var x = cl[c]; return { l: x.l, v: mean(x.p), n: x.p.length, cb: x.cb / x.p.length * 100, tp: x.tp }; });

    /* girls and boys, by each class's gender (📊 B vs G) */
    var genderOf = function (r) { return D.genders[normCls(r.c)] || ''; };
    var noGender = {};
    rows.forEach(function (r) { if (r.c && !genderOf(r)) noGender[String(r.c)] = 1; });
    function side(g) {
      var rs = rows.filter(function (r) { return genderOf(r) === g; }), cs = rs.filter(counts), ps = [], top = 0, low = 0;
      cs.forEach(function (r) {
        var p = pctOf(r); if (p === null) return; ps.push(p);
        var gr = gradeOf(p, boundsFor(D, r.a, preview).pcts);
        if (gr === 'A*' || gr === 'A') top++;
        if (gr === 'D' || gr === 'E' || gr === 'F' || gr === 'G' || gr === 'U') low++;
      });
      var e = [0, 0, 0, 0, 0, 0, 0, 0]; rs.forEach(function (r) { errorCounts(r.e).forEach(function (x, i) { e[i] += x; }); });
      var es = e.reduce(function (a, b) { return a + b; }, 0);
      var en = rs.map(function (r) { return parseInt(r.en, 10); }).filter(function (x) { return x >= 1 && x <= 4; });
      var cf = rs.map(function (r) { return parseInt(r.cf, 10); }).filter(function (x) { return x >= 1 && x <= 5; });
      return { n: rs.length, nc: ps.length, mean: mean(ps), top: ps.length ? top / ps.length * 100 : null, low: ps.length ? low / ps.length * 100 : null,
               eng: mean(en), conf: mean(cf), err: ERR.map(function (x, i) { return es ? e[i] / es * 100 : 0; }) };
    }
    out.girls = side('girls'); out.boys = side('boys'); out.noGender = Object.keys(noGender).sort();
    return out;
  }

  /* =====================================================================================================
     2. THE DRAWING: plain SVG. Bars start at 0; thin bars with a rounded data end; text in text colours.
     ===================================================================================================== */
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function fx(n) { return Math.round(n * 100) / 100; }
  function barPath(x, y, w, h) {
    var r = Math.min(4, w / 2, h / 2); if (w <= 0) return '';
    return 'M' + fx(x) + ',' + fx(y) + 'h' + fx(w - r) + 'a' + fx(r) + ',' + fx(r) + ' 0 0 1 ' + fx(r) + ',' + fx(r) + 'v' + fx(h - 2 * r) + 'a' + fx(r) + ',' + fx(r) + ' 0 0 1 ' + fx(-r) + ',' + fx(r) + 'h' + fx(-(w - r)) + 'z';
  }
  function vbarPath(x, base, w, h) {
    var r = Math.min(4, w / 2, h / 2); if (h <= 0) return '';
    return 'M' + fx(x) + ',' + fx(base) + 'v' + fx(-(h - r)) + 'a' + fx(r) + ',' + fx(r) + ' 0 0 1 ' + fx(r) + ',' + fx(-r) + 'h' + fx(w - 2 * r) + 'a' + fx(r) + ',' + fx(r) + ' 0 0 1 ' + fx(r) + ',' + fx(r) + 'v' + fx(h - r) + 'z';
  }
  /* horizontal bars. Wide: each label to the left of its bar, one row per bar, so a long list stays short (Daniel, 1 Oct
     2026: the data first, less scrolling). Narrow: the label above its bar, so long topic names never squeeze it. */
  function hbars(rows, o) {
    var W = o.w, max = o.max || 100, side = W >= 700, subs = rows.some(function (r) { return r.sub; });
    var two = !side && subs && W < 560, top = 4, bot = 26, right = 70;
    var labW = side ? Math.min(330, Math.round(W * 0.32)) : 0, plotW = W - labW - right;
    var rowH = side ? (subs ? 44 : 34) : two ? 64 : subs ? 56 : 46;
    var H = top + rows.length * rowH + bot, X = function (v) { return plotW * Math.max(0, Math.min(v, max)) / max; };
    var fit = function (t, px) { t = String(t); var n = Math.floor(px / 7.6); return t.length > n ? t.slice(0, Math.max(1, n - 1)) + '\u2026' : t; };
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(o.aria) + '">';
    (o.ticks || [0, 25, 50, 75, 100]).forEach(function (t) {
      var x = labW + X(t); s += '<line class="g-grid" x1="' + fx(x) + '" x2="' + fx(x) + '" y1="' + top + '" y2="' + (H - bot) + '"/>' +
        '<text class="t-ax" x="' + fx(x) + '" y="' + (H - 6) + '" text-anchor="' + (t === 0 ? 'start' : 'middle') + '">' + t + (o.unit || '') + '</text>';
    });
    s += '<line class="g-axis" x1="' + labW + '" x2="' + labW + '" y1="' + top + '" y2="' + (H - bot) + '"/>';
    rows.forEach(function (r, i) {
      var y = top + i * rowH, w = X(r.v), by;
      if (side) {
        by = y + (rowH - 16) / 2;
        s += '<text class="t-lab" x="' + (labW - 10) + '" y="' + (subs && r.sub ? y + 17 : by + 12) + '" text-anchor="end">' + esc(fit(r.l, labW - 14)) + '</text>';
        if (r.sub) s += '<text class="t-sub" x="' + (labW - 10) + '" y="' + (y + 34) + '" text-anchor="end">' + esc(fit(r.sub, labW - 14)) + '</text>';
        s += '<path fill="' + (r.col || 'var(--s1)') + '" d="' + barPath(labW, by, Math.max(w, r.v > 0 ? 2 : 0), 16) + '"/>';
        s += '<text class="t-val" x="' + fx(labW + w + 8) + '" y="' + (by + 13) + '">' + esc(r.text !== undefined ? r.text : rnd(r.v) + (o.unit || '')) + '</text>';
      } else {
        by = y + rowH - 20;
        s += '<text class="t-lab" x="0" y="' + (y + 15) + '">' + esc(r.l) + (r.sub && !two ? '<tspan class="t-sub" dx="8">' + esc(r.sub) + '</tspan>' : '') + '</text>';
        if (r.sub && two) s += '<text class="t-sub" x="0" y="' + (y + 30) + '">' + esc(r.sub) + '</text>';
        s += '<path fill="' + (r.col || 'var(--s1)') + '" d="' + barPath(0, by, Math.max(w, r.v > 0 ? 2 : 0), 14) + '"/>';
        s += '<text class="t-val" x="' + fx(w + 8) + '" y="' + (by + 12) + '">' + esc(r.text !== undefined ? r.text : rnd(r.v) + (o.unit || '')) + '</text>';
      }
      s += '<rect class="hit" x="0" y="' + y + '" width="' + W + '" height="' + rowH + '" data-tip="' + esc(r.tip || '') + '"/>';
    });
    return s + '</svg>';
  }
  /* vertical bars for the grade spread */
  function vbars(rows, o) {
    var W = o.w, H = 330, top = 24, bot = 30, left = 34, max = Math.max(1, Math.max.apply(null, rows.map(function (r) { return r.v; })));
    var step = Math.ceil(max / 4 / 5) * 5 || 1; if (max <= 8) step = Math.ceil(max / 4);
    var top4 = step * 4, Y = function (v) { return (H - top - bot) * v / top4; };
    var bw = Math.min(72, (W - left) / rows.length * 0.56), gap = (W - left) / rows.length;
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(o.aria) + '">';
    for (var t = 0; t <= 4; t++) { var y = H - bot - Y(t * step); s += '<line class="g-grid" x1="' + left + '" x2="' + W + '" y1="' + fx(y) + '" y2="' + fx(y) + '"/><text class="t-ax" x="' + (left - 6) + '" y="' + fx(y + 4) + '" text-anchor="end">' + t * step + '</text>'; }
    s += '<line class="g-axis" x1="' + left + '" x2="' + W + '" y1="' + (H - bot) + '" y2="' + (H - bot) + '"/>';
    rows.forEach(function (r, i) {
      var x = left + gap * i + (gap - bw) / 2, h = Y(r.v);
      s += '<path fill="' + (r.col || 'var(--s1)') + '" d="' + vbarPath(x, H - bot, bw, h) + '"/>';
      if (r.v > 0) s += '<text class="t-val" x="' + fx(x + bw / 2) + '" y="' + fx(H - bot - h - 6) + '" text-anchor="middle">' + r.v + '</text>';
      s += '<text class="t-lab" x="' + fx(x + bw / 2) + '" y="' + (H - 8) + '" text-anchor="middle">' + esc(r.l) + '</text>';
      s += '<rect class="hit" x="' + fx(left + gap * i) + '" y="' + top + '" width="' + fx(gap) + '" height="' + (H - top) + '" data-tip="' + esc(r.tip) + '"/>';
    });
    return s + '</svg>';
  }
  /* two-part bars (keywords): did not know + partly knew */
  function stacked(rows, o) {
    var W = o.w, rowH = 46, top = 4, bot = 26, right = 70, max = Math.max(1, Math.max.apply(null, rows.map(function (r) { return r.dk + r.pa; })));
    var nice = Math.ceil(max / 5) * 5, X = function (v) { return (W - right) * v / nice; }, H = top + rows.length * rowH + bot;
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(o.aria) + '">';
    for (var t = 0; t <= nice; t += nice / 5) { var x = X(t); s += '<line class="g-grid" x1="' + fx(x) + '" x2="' + fx(x) + '" y1="' + top + '" y2="' + (H - bot) + '"/><text class="t-ax" x="' + fx(x) + '" y="' + (H - 6) + '" text-anchor="' + (t ? 'middle' : 'start') + '">' + t + '</text>'; }
    rows.forEach(function (r, i) {
      var y = top + i * rowH, by = y + rowH - 20, w1 = X(r.dk), w2 = X(r.pa);
      s += '<text class="t-lab" x="0" y="' + (y + 14) + '">' + esc(r.l) + '</text>';
      if (r.dk) s += '<rect fill="var(--s2)" x="0" y="' + by + '" width="' + fx(Math.max(1, w1 - (r.pa ? 2 : 0))) + '" height="14"/>';
      if (r.pa) s += '<path fill="var(--s1)" d="' + barPath(w1, by, w2, 14) + '"/>';
      s += '<text class="t-val" x="' + fx(w1 + w2 + 8) + '" y="' + (by + 12) + '">' + r.dk + ' + ' + r.pa + '</text>';
      s += '<rect class="hit" x="0" y="' + y + '" width="' + W + '" height="' + rowH + '" data-tip="' + esc('<b>' + esc(r.l) + '</b><br>' + r.dk + ' did not know it · ' + r.pa + ' partly knew it<br>flagged on ' + rnd(r.pc) + ' % of reflections') + '"/>';
    });
    return s + '</svg>';
  }
  /* paired dots on one 0–100 axis (girls and boys) */
  function dots(rows, o) {
    var W = o.w, rowH = 46, top = 4, bot = 24, H = top + rows.length * rowH + bot, X = function (v) { return 8 + (W - 16) * clamp(v, 0, 100) / 100; };
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(o.aria) + '">';
    [0, 25, 50, 75, 100].forEach(function (t) { var x = X(t); s += '<line class="g-grid" x1="' + fx(x) + '" x2="' + fx(x) + '" y1="' + top + '" y2="' + (H - bot) + '"/><text class="t-ax" x="' + fx(x) + '" y="' + (H - 6) + '" text-anchor="middle">' + t + ' %</text>'; });
    rows.forEach(function (r, i) {
      var y = top + i * rowH + 32, a = r.g === null ? null : X(r.g), b = r.b === null ? null : X(r.b);
      s += '<text class="t-lab" x="0" y="' + (y - 16) + '">' + esc(r.l) + '</text>';
      if (a !== null && b !== null) s += '<line stroke="var(--axis)" stroke-width="2" x1="' + fx(Math.min(a, b)) + '" x2="' + fx(Math.max(a, b)) + '" y1="' + y + '" y2="' + y + '"/>';
      if (a !== null) s += '<circle cx="' + fx(a) + '" cy="' + y + '" r="6" fill="var(--s1)" stroke="var(--ink-2)" stroke-width="2"/>';
      if (b !== null) s += '<circle cx="' + fx(b) + '" cy="' + y + '" r="6" fill="var(--s2)" stroke="var(--ink-2)" stroke-width="2"/>';
      s += '<rect class="hit" x="0" y="' + (y - 30) + '" width="' + W + '" height="' + rowH + '" data-tip="' + esc('<b>' + esc(r.l) + '</b><br>Girls ' + rnd(r.g) + ' % · Boys ' + rnd(r.b) + ' %') + '"/>';
    });
    return s + '</svg>';
  }
  /* where a paper's marks are: one bar in four parts */
  var MIX = [{ k: 'own', l: 'its own topics', c: 'var(--s1)' }, { k: 'earlier', l: 'earlier topics', c: '#6B8594' },
             { k: 'ao3', l: 'AO3 practical skills', c: 'var(--s2)' }, { k: 'late', l: '⚠ not yet taught', c: 'var(--down)' },
             { k: 'unmapped', l: 'no syllabus point in the map', c: '#4A5A64' }];
  function marksTxt(v) { var x = Math.round(v * 10) / 10; return x + (x === 1 ? ' mark' : ' marks'); }
  function mixBar(b, W) {
    var x = 0, s = '<svg viewBox="0 0 ' + W + ' 30" role="img" aria-label="Where the paper’s marks are">';
    MIX.forEach(function (g) {
      var v = b.cat[g.k]; if (!v || !b.total) return; var w = W * v / b.total;
      s += '<rect x="' + fx(x) + '" y="4" width="' + fx(Math.max(1, w - 2)) + '" height="20" rx="3" fill="' + g.c + '"/><rect class="hit" x="' + fx(x) + '" y="0" width="' + fx(w) + '" height="30" data-tip="' + esc('<b>' + g.l + '</b><br>' + marksTxt(v) + ' of ' + b.total + ' (' + rnd(v / b.total * 100) + ' %)') + '"/>';
      x += w;
    });
    return s + '</svg><div class="legend" style="margin-top:6px">' + MIX.map(function (g) {
      var v = b.cat[g.k];
      return v ? '<span><i style="background:' + g.c + '"></i>' + g.l + ': ' + marksTxt(v) + ' (' + rnd(v / b.total * 100) + ' %)</span>' : '';
    }).join('') + '</div>';
  }
  /* one square per syllabus point and a bar per sub-topic, with an even-share line. Wide: label | squares | bar on one
     line. Narrow: label, then squares and bar; the bar drops below when they do not fit. */
  function subMap(b, W, outline) {
    if (!b.subs.length) return '<p class="empty">No sub-topics to show: the map names no topic of its own.</p>';
    var heavyX = Balance ? Balance.LIMITS.heavy : 2;
    var two = W < 560, labW = two ? 0 : 230, cell = two ? 10 : 13, gapC = two ? 3 : 4, maxSt = Math.max.apply(null, b.subs.map(function (r) { return r.sts.length; }));
    var cellsW = maxSt * (cell + gapC), three = two && cellsW + 14 + 40 + 84 > W;
    var barX = three ? 0 : two ? cellsW + 14 : labW + cellsW + 14, barW = Math.max(40, W - barX - 84), rowH = three ? 62 : two ? 44 : 28;
    var maxM = Math.max(b.even * heavyX, Math.max.apply(null, b.subs.map(function (r) { return r.m; })), 1), X = function (v) { return barW * v / maxM; };
    var y = 2, s = '', lastT = '';
    b.subs.forEach(function (r) {
      if (r.topic !== lastT) {
        lastT = r.topic; y += 8;
        var tt = outline && outline.t[r.topic.slice(1)], head = 'TOPIC ' + r.topic.slice(1) + (tt ? ' · ' + tt.title.toUpperCase() : ''), fit = Math.floor(W / 7.2);
        s += '<text class="t-sub" x="0" y="' + (y + 10) + '">' + esc(head.length > fit ? head.slice(0, fit - 1) + '…' : head) + '</text>'; y += 20;
      }
      var ly = y + 14, cy = two ? y + 22 : y + 4, lab = r.n + ' ' + r.l, lfit = two ? Math.floor(W / 7.4) : 34;
      s += '<text class="t-lab" x="0" y="' + ly + '">' + esc(lab.length > lfit ? lab.slice(0, lfit - 1) + '…' : lab) + '</text>';
      r.sts.forEach(function (st, k) {
        var ref = r.n + '.' + st[0], cv = r.cov[ref] || '', cx = (two ? 0 : labW) + k * (cell + gapC);
        var hasM = cv.indexOf('mcq') >= 0, hasW = cv.indexOf('wr') >= 0;
        if (hasM && hasW) s += '<rect x="' + cx + '" y="' + cy + '" width="' + (cell / 2) + '" height="' + cell + '" fill="var(--s1)"/><rect x="' + (cx + cell / 2) + '" y="' + cy + '" width="' + (cell / 2) + '" height="' + cell + '" fill="var(--s2)"/>';
        else if (hasM || hasW) s += '<rect x="' + cx + '" y="' + cy + '" width="' + cell + '" height="' + cell + '" rx="2" fill="' + (hasM ? 'var(--s1)' : 'var(--s2)') + '"/>';
        else s += '<rect x="' + (cx + 0.5) + '" y="' + (cy + 0.5) + '" width="' + (cell - 1) + '" height="' + (cell - 1) + '" rx="2" fill="none" stroke="var(--axis)"' + (st[1] === 'S' ? ' stroke-dasharray="2 2"' : '') + '/>';
        s += '<rect class="hit" x="' + cx + '" y="' + cy + '" width="' + cell + '" height="' + cell + '" data-tip="' + esc('<b>' + ref + '</b> (' + (st[1] === 'S' ? 'Supplement' : 'Core') + ')<br>' + (hasM && hasW ? 'multiple choice and structured' : hasM ? 'multiple choice' : hasW ? 'structured' : 'not in this test')) + '"/>';
      });
      var by = three ? cy + cell + 8 : cy + 1, wM = X(r.mcq), wW = X(r.wr);
      s += '<line class="g-grid" x1="' + barX + '" x2="' + fx(barX + barW) + '" y1="' + (by + 5.5) + '" y2="' + (by + 5.5) + '"/>';
      if (r.mcq) s += '<rect x="' + barX + '" y="' + by + '" width="' + fx(Math.max(1, wM - (r.wr ? 2 : 0))) + '" height="11" fill="var(--s1)"/>';
      if (r.wr) s += '<path fill="var(--s2)" d="' + barPath(barX + wM, by, Math.max(2, wW), 11) + '"/>';
      s += '<line stroke="var(--chalk-mute)" stroke-width="1.5" stroke-dasharray="2 2" x1="' + fx(barX + X(b.even)) + '" x2="' + fx(barX + X(b.even)) + '" y1="' + (by - 3) + '" y2="' + (by + 14) + '"/>';
      s += '<text class="t-val" x="' + fx(barX + Math.max(wM + wW, X(b.even)) + 8) + '" y="' + (by + 10) + '">' + (r.miss ? '<tspan fill="#FCD38A">not covered</tspan>' : (Math.round(r.m * 10) / 10) + (r.heavy ? ' <tspan fill="#FCD38A">heavy</tspan>' : '')) + '</text>';
      s += '<rect class="hit" x="' + barX + '" y="' + (by - 4) + '" width="' + fx(W - barX) + '" height="20" data-tip="' + esc('<b>' + esc(r.n + ' ' + r.l) + '</b><br>' + (Math.round(r.mcq * 10) / 10) + ' MCQ + ' + (Math.round(r.wr * 10) / 10) + ' structured marks<br>' + r.covN + ' of ' + r.sts.length + ' points · an even share is ' + (Math.round(b.even * 10) / 10)) + '"/>';
      y += rowH;
    });
    return '<svg viewBox="0 0 ' + W + ' ' + (y + 6) + '" role="img" aria-label="Marks and points in each sub-topic">' + s + '</svg>';
  }
  function spark(vals) {   // point to point, first to last; no line of best fit
    var pts = vals.map(function (v, i) { return v === null ? null : [6 + i * (78 / Math.max(1, vals.length - 1)), 22 - v / 100 * 18]; }), d = '', last = null;
    pts.forEach(function (p) { if (!p) return; d += (d ? 'L' : 'M') + p[0].toFixed(1) + ',' + p[1].toFixed(1); last = p; });
    return '<svg width="90" height="26" viewBox="0 0 90 26" aria-hidden="true"><line x1="0" x2="90" y1="22" y2="22" class="g-grid"/>' +
      (d ? '<path d="' + d + '" fill="none" stroke="var(--s1)" stroke-width="2"/><circle cx="' + last[0].toFixed(1) + '" cy="' + last[1].toFixed(1) + '" r="3" fill="var(--s1)"/>' : '') + '</svg>';
  }
  function deltaBar(d) {
    if (d === null || d === undefined) return '<span class="nym">—</span>';
    var w = Math.min(36, Math.abs(d) * 1.2), up = d >= 0;
    return '<svg width="80" height="14" viewBox="0 0 80 14" aria-hidden="true" style="vertical-align:-2px"><line x1="40" x2="40" y1="0" y2="14" class="g-axis"/>' +
      '<rect x="' + fx(up ? 40 : 40 - w) + '" y="3" width="' + fx(w) + '" height="8" rx="2" fill="' + (up ? 'var(--st-good)' : 'var(--st-low)') + '"/></svg> ' +
      (d > 2 ? '▲ +' : d < -2 ? '▼ ' : (d > 0 ? '+' : '')) + Math.round(d);
  }
  /* How well, in three bands (Daniel, 1 Oct 2026: "use this colour coding here too", as the old tracker tabs did: 75 % or
     more, 50–74 %, below 50 %). Status colours checked for colour-blind readers on the dark chart card (dataviz
     validator: worst pair ΔE 10.3); every coloured mark also prints its number, and each chart has a legend, so colour
     is never the only signal. Charts of categories (reasons, girls and boys, keywords, test balance) stay uncoloured. */
  var BANDS = [{ min: 75, k: 'good', c: 'var(--st-good)', t: 'rgba(43,179,154,.30)', l: '75 % or more' },
               { min: 50, k: 'mid', c: 'var(--st-mid)', t: 'rgba(242,181,68,.28)', l: '50–74 %' },
               { min: -1, k: 'low', c: 'var(--st-low)', t: 'rgba(217,83,79,.32)', l: 'below 50 %' }];
  function band(v) { for (var i = 0; i < BANDS.length; i++) if (v >= BANDS[i].min) return BANDS[i]; return BANDS[2]; }
  function bandCol(v) { return v === null || v === undefined || isNaN(v) ? 'var(--s1)' : band(v).c; }
  function gradeBand(g) { return g === 'A*' || g === 'A' ? BANDS[0] : g === 'B' || g === 'C' ? BANDS[1] : BANDS[2]; }
  function bandLegend(kind) {
    var words = kind === 'grades' ? ['A* or A', 'B or C', 'D or below'] : kind === 'wrong' ? ['wrong in 25 % or fewer', '26–50 % wrong', 'more than 50 % wrong'] : BANDS.map(function (b) { return b.l; });
    return '<div class="legend">' + BANDS.map(function (b, i) { return '<span><i style="background:' + b.c + '"></i>' + words[i] + '</span>'; }).join('') + '</div>';
  }
  function heatBg(v) {  // one hue, dark to bright, for a class × topic table
    var t = clamp((v - 30) / 60, 0, 1), a = [21, 48, 61], b = [92, 190, 236];
    return 'rgb(' + a.map(function (x, i) { return Math.round(x + (b[i] - x) * t); }).join(',') + ')';
  }
  function tableHtml(cap, head, body, numCols) {
    return '<div class="tw"><table><thead><tr>' + head.map(function (h, i) { return '<th' + (numCols && numCols[i] ? ' class="n"' : '') + '>' + h + '</th>'; }).join('') + '</tr></thead><tbody>' +
      body.map(function (r) { return '<tr>' + r.map(function (c, i) { return '<td' + (numCols && numCols[i] ? ' class="n"' : '') + '>' + c + '</td>'; }).join('') + '</tr>'; }).join('') +
      '</tbody></table></div><p class="tcap">' + cap + '</p>';
  }
  /* One test's balance, as the page shows it (and tools/test-balance.mjs draws it): the answer, what to look at, where
     its marks are, its sub-topics, and its versions. `o.table` gives the tables in place of the charts. */
  function balancePanelHtml(b, vc, W, outline, o) {
    o = o || {};
    var L = Balance ? Balance.LIMITS : { ownShare: 70, heavy: 2, versionGap: 2 };
    var flags = (Balance ? Balance.flagsOf(b) : []);
    if (vc) vc.flagged.forEach(function (r) { flags.push('the versions differ by ' + r.gap + ' marks in “' + r.l + '” (' + vc.versions.map(function (v, k) { return v + ' ' + r.vals[k]; }).join(', ') + ')'); });
    var h = '<p class="answer"><b>' + rnd(b.ownPct) + ' %</b> of the marks are on its own topics (' + esc(b.own.join(', ') || 'none named') + '). It reaches <b>' + b.subsHit + ' of ' + b.subs.length +
      '</b> sub-topics and <b>' + b.nCov + ' of ' + b.nSt + '</b> points (Core ' + b.core[0] + ' of ' + b.core[1] + ', Supplement ' + b.supp[0] + ' of ' + b.supp[1] + '). AO3: ' + rnd(b.ao3Pct) +
      ' % of the paper (the whole 0610 qualification: ' + (Balance ? Balance.AO3_QUALIFICATION : 20) + ' %).</p>';
    if (flags.length) h += '<p class="partial">To look at: ' + flags.map(esc).join('; ') + '.</p>';
    else h += '<p class="rule-note">Nothing to look at: at least ' + L.ownShare + ' % on its own topics, no heavy sub-topic, every sub-topic has marks, nothing not yet taught.</p>';
    if (!o.table) {
      h += '<figure class="fig">' + mixBar(b, W) + '<figcaption>Figure 1. Bar chart showing where the ' + b.total + ' marks of ' + esc(b.name) + (b.ver ? ' (version ' + esc(b.ver) + ')' : '') + ' are.</figcaption></figure>' +
        '<figure class="fig"><div class="legend"><span><i style="background:var(--s1)"></i>multiple choice</span><span><i style="background:var(--s2)"></i>structured</span><span><i style="background:none;border:1px solid var(--axis)"></i>not in this test (dashed: Supplement)</span><span>┆ an even share</span></div>' +
        subMap(b, W, outline) + '<figcaption>Figure 2. Chart showing, for each sub-topic of the test’s own topics, which syllabus points are tested (one square per point) and how many marks it carries.</figcaption></figure>';
    } else {
      h += tableHtml('Table 1. Data showing the marks and points of each sub-topic.', ['Sub-topic', 'MCQ marks', 'Structured marks', 'Points covered', 'Flag'],
        b.subs.map(function (r) { return [esc(r.n + ' ' + r.l), Math.round(r.mcq * 10) / 10, Math.round(r.wr * 10) / 10, r.covN + ' of ' + r.sts.length, r.miss ? 'not covered' : r.heavy ? 'heavy' : '']; })
          .concat([['Earlier topics', '', '', '', marksTxt(b.cat.earlier)], ['AO3 practical skills', '', '', '', marksTxt(b.cat.ao3)], ['Not yet taught', '', '', '', b.cat.late ? '⚠ ' + marksTxt(b.cat.late) : '—']]), [0, 1, 1, 1, 0]);
    }
    if (vc) h += tableHtml('Table ' + (o.table ? 2 : 1) + '. Data showing the marks of each version (flag: more than ' + L.versionGap + ' marks apart).',
      ['Marks on…'].concat(vc.versions.map(function (v) { return 'Version ' + esc(v); })).concat(['']),
      vc.rows.map(function (r) { return [r.l].concat(r.vals).concat([r.flag ? '<span class="nym">⚠ ' + r.gap + ' apart</span>' : '✓']); }),
      [0].concat(vc.versions.map(function () { return 1; })).concat([0]));
    return h;
  }

  var api = {
    GRADES: GRADES, DEFAULT_PCTS: DEFAULT_PCTS, BOUND_GRADES: BOUND_GRADES, ERR: ERR, TIMING: TIMING,
    kindOf: kindOf, gradeOf: gradeOf, pctOf: pctOf, parseDay: parseDay, errorCounts: errorCounts, normCls: normCls,
    prepare: prepare, yearOfTab: yearOfTab, famsOfTab: famsOfTab, gradOf: gradOf, boundsFor: boundsFor, coverage: coverage, analyse: analyse,
    esc: esc, hbars: hbars, vbars: vbars, stacked: stacked, dots: dots, mixBar: mixBar, subMap: subMap, spark: spark, deltaBar: deltaBar,
    tableHtml: tableHtml, balancePanelHtml: balancePanelHtml
  };
  root.Analysis = api;
  if (typeof module === 'object' && module && module.exports) module.exports = api;

  /* =====================================================================================================
     3. THE PAGE (a browser only)
     ===================================================================================================== */
  if (typeof document === 'undefined' || !root.document) return;
  var doc = root.document, CFG = root.HUB_LOCAL || {}, SI = root.SignIn || null, OUTLINE = root.SYLLABUS_OUTLINE || null;
  var URL_ = /^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(String(CFG.analysisUrl || '')) ? String(CFG.analysisUrl) : '';
  var CID = String(CFG.googleClientId || '');
  var main = doc.getElementById('main'), acct = doc.getElementById('acct'), tip = doc.getElementById('tip'), viewersEl = doc.getElementById('viewers');
  var IDLE_MS = 20 * 60 * 1000;
  var S = { screen: '', D: null, me: '', tab: '', k: '', c: '', q: 'cover', own: false, table: {}, bEdit: false, bSame: false, preview: null,
            bMsg: '', bBad: false, bv: '', readAt: 0, viewers: 0, canBounds: false, busy: false, saving: false, flash: '', lastUse: Date.now() };
  var LOOK = { type: 'standard', theme: 'filled_black', size: 'large', text: 'signin_with', shape: 'pill', logo_alignment: 'left', width: 240, locale: 'en-GB' };

  /* Nothing of the data outlives what is on the screen: no storage, and wiped on pagehide, after 20 minutes without
     use, and on sign-out. */
  function wipe() {
    S.D = null; S.me = ''; S.preview = null; S.bEdit = false; S.bMsg = ''; S.flash = ''; S.canBounds = false; S.viewers = 0;
    if (viewersEl) viewersEl.textContent = '';
    if (tip) tip.hidden = true;
  }
  function when(ms) {
    var d = new Date(ms); if (isNaN(d.getTime())) return '';
    return d.getDate() + ' ' + 'Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec'.split(' ')[d.getMonth()] + ', ' + ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
  }
  function dayTxt(ms) { var d = new Date(ms); return ms ? d.getDate() + ' ' + 'Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec'.split(' ')[d.getMonth()] + ' ' + d.getFullYear() : ''; }
  function setAcct() {
    var v = SI && SI.who();
    acct.innerHTML = v ? '<div class="chip"><span class="chip__dot">' + esc(String(v.name || v.email).trim().charAt(0).toUpperCase()) + '</span><span class="chip__who">Signed in as ' + esc(v.email) + '</span></div><button class="btn" data-out>Sign out</button>' : '';
  }
  function gate(eyebrow, title, body, buttons) {
    main.innerHTML = '<section class="gate"><p class="eyebrow">' + eyebrow + '</p><h2>' + title + '</h2>' + body +
      (buttons ? '<div class="gate__row">' + buttons + '</div>' : '') + '</section>';
  }

  /* ---------- the screens: signed out, not on the list, reading, the analysis, hidden ---------- */
  function screenSignIn(why) {
    S.screen = 'signin'; wipe(); setAcct();
    gate('Private page', 'Sign in to see the analysis',
      (why ? '<p class="stale">' + esc(why) + '</p>' : '') +
      '<p>This page holds no data. After you sign in, the school’s server checks your account. It sends the analysis only to the people on this page’s list.</p>' +
      '<div class="gate__row"><div class="gsi-slot" id="gsi"></div></div>' +
      '<p class="muted" style="margin-top:16px">Use your school Google account. One press: this is Google’s own button. Already signed in on the Biology Hub? Then you are signed in here too.</p>');
    mountButton();
  }
  function mountButton() {
    var el = doc.getElementById('gsi'); if (!el || !SI) return;
    if (SI.button(el, CID, LOOK)) return;
    el.innerHTML = '<span class="muted">Loading sign-in…</span>';
    SI.loaded(function (ok) {
      var e2 = doc.getElementById('gsi'); if (!e2) return;
      e2.innerHTML = '';
      if (ok && SI.button(e2, CID, LOOK)) return;
      e2.innerHTML = '<span class="muted">Google’s sign-in could not load here. Reload the page, or try another network.</span>';
    }, 10000);
  }
  var WHY = {
    'not on the list': ['Not on the list', 'This account cannot see the analysis',
      function (v) { return '<p>You signed in as <b>' + esc(v ? v.email : '') + '</b>. That account is not on this page’s list, so the server sent nothing.</p>' +
        '<p>If you should be on the list, ask a teacher who can edit the Student Progress Tracker to add you there: 📊 Analysis website ▸ 👥 Who can see the analysis website…</p>'; }, true],
    'sign-in is not set up': ['Not set up', 'The server is not set up yet',
      function () { return '<p>The tracker’s script has no sign-in settings yet (CLIENT_ID and SCHOOL_DOMAIN). They are typed once, in the Student Progress Tracker’s Apps Script.</p>'; }, true],
    'cannot reach the tracker': ['Not available', 'The server cannot read the tracker just now',
      function () { return '<p>Try again in a minute. If it keeps happening, open the Student Progress Tracker and run 📊 Analysis website ▸ 🩺 Check the analysis set-up.</p>'; }, false],
    'pupil codes clash': ['Stopped', 'Two pupils got the same hidden code',
      function () { return '<p>The server joins each pupil’s papers with a code made from their school account. Two accounts gave the same code, so it stopped rather than mix their papers. This is very rare: tell Daniel.</p>'; }, false],
    'network': ['Not available', 'The page could not reach the server',
      function () { return '<p>Check the connection, then try again.</p>'; }, false],
    'old browser': ['Browser too old', 'This browser cannot open the analysis',
      function () { return '<p>The analysis arrives packed, and this browser cannot unpack it. Update the browser (Chrome, Edge, Safari or Firefox from 2023 or later), then open this page again.</p>'; }, false],
    'no address': ['Not set up', 'This page has no server address yet',
      function () { return '<p>Its address goes in the hub’s js/local.js (analysisUrl) once the Student Progress Tracker’s script is deployed as a web app.</p>'; }, false]
  };
  function screenRefused(why) {
    S.screen = 'refused'; wipe(); setAcct();
    var w = WHY[why] || ['Not available', 'The server said no', function () { return '<p>' + esc(why || 'No reason was given.') + '</p>'; }, false];
    var v = SI && SI.who();
    gate(w[0], w[1], w[2](v), (v ? '<button class="btn" data-out>Sign out</button>' + (w[3] ? '<button class="btn" data-other>Use another account</button>' : '') : '') +
      (why === 'network' || why === 'cannot reach the tracker' ? '<button class="btn btn--solid" data-again>Try again</button>' : ''));
  }
  function screenLoading(text) {
    S.screen = 'loading'; setAcct();
    gate('Reading the tracker', text || 'Getting the latest scores…',
      '<p>The first look after a change to the tracker takes about 20 seconds. After that, it opens at once.</p><div class="bar"><i></i></div>');
  }
  function screenHidden() {
    S.screen = 'hidden'; wipe(); setAcct();
    gate('Hidden', 'The analysis is hidden',
      '<p>Nobody used this page for 20 minutes, or it was left, so it cleared the data from the screen. This protects pupils’ data on a shared computer.</p>',
      '<button class="btn btn--solid" data-again>Show it again</button><button class="btn" data-out>Sign out</button>');
  }

  /* ---------- asking the server ---------- */
  function unpack(b64) {
    var bin = atob(String(b64 || '')), bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    var stream = new Blob([bytes]).stream().pipeThrough(new root.DecompressionStream('gzip'));
    return new Response(stream).text().then(function (t) { return JSON.parse(t); });
  }
  function defaultTab(D) {
    var withRows = D.tabs.filter(function (t) { return D.rows.some(function (r) { return r.t === t; }); });
    return (withRows[0] || D.tabs[0] || '');
  }
  function ask(fresh) {
    if (!URL_) return screenRefused('no address');
    if (!root.DecompressionStream || !root.Blob || !Blob.prototype.stream) return screenRefused('old browser');
    var v = SI && SI.live();
    if (!v) {
      if (SI && SI.who()) {
        if (!S.D) screenLoading('Renewing your sign-in…');
        SI.renew(CID, function (nv) { if (nv) ask(fresh); else screenSignIn('Your sign-in ran out after an hour. Sign in again.'); });
        return;
      }
      return screenSignIn();
    }
    if (S.busy) return;
    S.busy = true;
    if (!S.D) screenLoading(); else { S.flash = 'Reading the tracker again…'; draw(); }
    var me = v.email;
    fetch(URL_, { method: 'POST', mode: 'cors', credentials: 'omit', cache: 'no-store', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                  body: JSON.stringify({ action: 'analysis', token: v.token, fresh: !!fresh }) })
      .then(function (r) { if (!r.ok) throw new Error('http ' + r.status); return r.json(); })
      .then(function (j) {
        var now = SI.who();
        if (!now || now.email !== me) { S.busy = false; return; }          /* signed out, or somebody else, meanwhile */
        if (!j || !j.ok) {
          S.busy = false;
          if (j && j.why === 'not signed in') return screenSignIn('The server did not accept the sign-in. Sign in again.');
          return screenRefused(j && j.why ? j.why : 'network');
        }
        return unpack(j.gz).then(function (P) {
          S.busy = false;
          var now2 = SI.who(); if (!now2 || now2.email !== me) return;
          S.D = prepare(P); S.me = me; S.readAt = +j.at || Date.now(); S.viewers = +j.viewers || 0; S.canBounds = !!j.canBounds;
          S.flash = j.freshWait ? 'The tracker was read less than a minute ago: this is the newest data.' : '';
          S.lastUse = Date.now();
          if (!S.tab || S.D.tabs.indexOf(S.tab) < 0) { S.tab = defaultTab(S.D); S.k = ''; S.c = ''; }
          if (S.k && !S.D.fams[S.k]) S.k = '';
          S.screen = 'analysis'; draw();
        });
      })
      .catch(function () {
        S.busy = false;
        if (S.D) { S.flash = 'Could not read the tracker again just now. What you see is from ' + when(S.readAt) + '.'; draw(); }
        else screenRefused('network');
      });
  }

  /* ---------- the analysis ---------- */
  var QUESTIONS = [
    { group: 'The data', note: 'what is in, what is not yet', items: [{ id: 'cover', t: 'Which classes have data yet?' }] },
    { group: 'Scores', note: 'marked papers', items: [
      { id: 'grades', t: 'How did the year group do?' }, { id: 'topics', t: 'Which topics lose the most marks?' },
      { id: 'progress', t: 'Who is improving, and who is slipping?' }, { id: 'classes', t: 'How do the classes compare?' },
      { id: 'sections', t: 'Multiple choice or written: where are marks lost?' }, { id: 'cmds', t: 'Which command words cause trouble?' },
      { id: 'mcq', t: 'Which multiple-choice questions went wrong most?' }] },
    { group: 'Reflections', note: 'every reflection', items: [
      { id: 'errors', t: 'Why do pupils say they lost marks?' }, { id: 'vocab', t: 'Which keywords do pupils not know?' },
      { id: 'timing', t: 'When did pupils revise, and did it help?' }] },
    { group: 'Groups', note: 'by each class’s gender', items: [{ id: 'bvg', t: 'Girls and boys: what differs?' }] },
    { group: 'The tests', note: 'how each paper was built', items: [{ id: 'balance', t: 'Is each test balanced, and do its versions match?' }] }];
  var SCORE_Q = { grades: 1, topics: 1, progress: 1, classes: 1, sections: 1, cmds: 1, mcq: 1, bvg: 1 };

  function famName(k) { var f = S.D.fams[k]; return f ? f.name : String(k).split('|')[0]; }
  function famShort(k) { var f = S.D.fams[k]; return f ? f.short : String(k).split('|')[0]; }   /* the registry's chart label: table headings */
  function idName(id) {
    var D = S.D, e = D.reg[id], f = D.fams[fkey(id)];
    return (f ? f.name : e ? e.name : id) + (e && f && f.ids.length > 1 && e.ver ? ' (version ' + e.ver + ')' : '');
  }
  function fkey(id) { var e = S.D.reg[id]; return e ? (e.fam || id) + '|' + (e.ay || '') : String(id) + '|'; }
  function classesOfTab(tab) {
    var set = {}; Object.keys(S.D.classes[tab] || {}).forEach(function (c) { set[c] = 1; });
    S.D.rows.forEach(function (r) { if (r.t === tab && r.c) set[r.c] = 1; });
    return Object.keys(set).sort(function (a, b) { return a.localeCompare(b, undefined, { numeric: true }); });
  }
  function scopeRows() { return S.D.rows.filter(function (r) { return r.t === S.tab && (!S.k || r.k === S.k) && (!S.c || r.c === S.c); }); }
  function uniq(a) { var o = []; a.forEach(function (x) { if (o.indexOf(x) < 0) o.push(x); }); return o; }

  function draw() { if (S.screen === 'analysis' && S.D) screenAnalysis(); }
  function screenAnalysis() {
    setAcct();
    var D = S.D, fams = famsOfTab(D, S.tab), classes = classesOfTab(S.tab);
    if (S.c && classes.indexOf(S.c) < 0) S.c = '';
    var rows = scopeRows(), A = analyse(D, rows, S.own, S.preview);
    var tabRows = D.rows.filter(function (r) { return r.t === S.tab; });
    A.cov = coverage(D, S.tab, tabRows, S.c ? [S.c] : classes, S.k ? [S.k] : fams.map(function (f) { return f.key; }), S.own);
    /* Daniel, 1 Oct 2026: the data first. One slim row of choices, one line saying what the numbers rest on, then the
       answer across the whole page: its question is the panel's title, a dropdown (‹ › step through them). */
    var html = '<section class="scope" aria-label="What to look at">' +
      '<div class="seg" role="group" aria-label="Year group">' +
        D.tabs.map(function (t) { var y = yearOfTab(D, t); return '<button data-tab="' + esc(t) + '" aria-pressed="' + (t === S.tab) + '">' + (y === null ? esc(t.slice(-4)) : y > 11 ? 'Left school' : 'Year ' + y) + ' <small>' + esc(t.slice(-4)) + '</small></button>'; }).join('') + '</div>' +
      '<select id="selA" aria-label="Assessment"><option value="">' + (fams.length === 1 ? 'All assessments (1)' : 'All ' + fams.length + ' assessments') + '</option>' +
        fams.map(function (f) { return '<option value="' + esc(f.key) + '"' + (f.key === S.k ? ' selected' : '') + '>' + esc(f.name) + (f.day ? ' (' + dayTxt(f.day) + ')' : '') + '</option>'; }).join('') + '</select>' +
      '<select id="selC" aria-label="Class"><option value="">All classes</option>' +
        classes.map(function (c) { return '<option value="' + esc(c) + '"' + (c === S.c ? ' selected' : '') + '>' + esc(c) + '</option>'; }).join('') + '</select>' +
    '</section>' + (S.flash ? '<p class="partial" role="status">' + esc(S.flash) + '</p>' : '') +
    '<div class="kinds"><span class="cov">Data from <b>' + A.cov.withData.length + ' of ' + A.cov.classes.length + '</b> ' + (A.cov.classes.length === 1 ? 'class' : 'classes') +
      (A.cov.missing.length ? ' <span class="miss">(' + esc(A.cov.missing.join(', ')) + ': no data yet)</span>' : '') + ' · ' + pl(A.nPupils, 'pupil') + ' · ' +
      '<b>' + (A.kinds.teacher + A.kinds.partly) + '</b> marked ' + (A.kinds.teacher + A.kinds.partly === 1 ? 'paper' : 'papers') + (A.kinds.partly ? ' (' + A.kinds.partly + ' with totals typed by the teacher)' : '') + '</span>' +
      (A.kinds.self ? '<button class="sw" role="switch" data-own aria-checked="' + S.own + '"><i></i>Include ' + A.kinds.self + ' paper' + (A.kinds.self === 1 ? '' : 's') + ' with only the pupils’ own marks</button>' : '') +
      '<span class="fresh"><span>Read ' + esc(when(S.readAt)) + (D.newest ? ' · newest data ' + esc(D.newest) : '') + '</span><button class="btn btn--sm' + (S.busy ? ' is-busy' : '') + '" data-fresh' + (S.busy ? ' disabled' : '') + '>Read again</button></span>' +
    '</div><section class="panel" id="panel"></section>';
    main.innerHTML = html;
    renderPanel(doc.getElementById('panel'), A);
    if (viewersEl) viewersEl.textContent = S.viewers ? S.viewers + (S.viewers === 1 ? ' person is' : ' people are') + ' on this page’s list.' : '';
  }

  function how(items) { return '<details class="how"><summary class="eyebrow">How this is worked out</summary><ul>' + items.map(function (i) { return '<li>' + i + '</li>'; }).join('') + '</ul></details>'; }
  function boundsLine(A) {
    var by = {};
    Object.keys(A.boundsUsed).forEach(function (id) { var s = A.boundsUsed[id]; (by[s] = by[s] || []).push(id); });
    var list = function (ids) { return uniq(ids.map(idName)).map(esc).join(', '); };
    if (by.preview) return 'PREVIEW: ' + list(by.preview) + ' ' + (by.preview.length > 1 ? 'are' : 'is') + ' graded on the boundaries you are trying, not saved yet.';
    var parts = [];
    if (by.home) parts.push('the boundaries saved for ' + list(by.home));
    if (by.mirror) parts.push('the annual boundaries stored in the 📦 Registry for ' + list(by.mirror));
    if (by['default']) parts.push(parts.length ? 'the default IGCSE boundaries for the other papers' : 'the default IGCSE boundaries');
    return parts.length ? 'Grades use ' + parts.join('; ') + '.' : '';
  }

  /* the tests of the chosen year group (or the one chosen), with their question maps */
  function balanceTests() {
    var D = S.D, grad = +String(S.tab).slice(-4), by = {}, order = [];
    Object.keys(D.reg).forEach(function (id) {
      var e = D.reg[id]; if (gradOf(e.ay, +e.yg) !== grad) return;
      var k = fkey(id); if (S.k && k !== S.k) return;
      if (!by[k]) { by[k] = []; order.push(k); }
      by[k].push(id);
    });
    if (S.k && !by[S.k] && D.fams[S.k]) { by[S.k] = D.fams[S.k].ids.slice(); order.push(S.k); }
    var tests = order.map(function (k) {
      var ids = by[k].sort(function (a, b) { return String((D.reg[a] || {}).ver || '').localeCompare(String((D.reg[b] || {}).ver || '')); });
      var maps = ids.map(function (id) { return D.maps[id] ? Object.assign({ id: id }, D.maps[id]) : null; });
      var bs = Balance && OUTLINE ? maps.map(function (m) { return m ? Balance.balance(m, OUTLINE) : null; }) : maps.map(function () { return null; });
      var have = bs.filter(Boolean);
      return { k: k, ids: ids, name: D.reg[ids[0]] ? String(D.reg[ids[0]].name || ids[0]) : famName(k), bs: bs, vc: have.length > 1 ? Balance.versions(have) : null };
    });
    var mapped = 0, flagged = 0;
    tests.forEach(function (t) { var famFlag = !!(t.vc && t.vc.flagged.length); t.bs.forEach(function (b) { if (!b) return; mapped++; if (famFlag || Balance.flagsOf(b).length) flagged++; }); });
    return { tests: tests, mapped: mapped, flagged: flagged };
  }

  function renderPanel(el, A) {
    var CARD = 38, PI = (el.clientWidth || 600) - (root.matchMedia('(max-width:820px)').matches ? 28 : 48), D = S.D, W = Math.max(250, PI - CARD);   // PI: the panel's inner width; CARD: a chart card's padding
    var id = S.q, item = null; QUESTIONS.forEach(function (g) { g.items.forEach(function (i) { if (i.id === id) item = i; }); });
    var yg = yearOfTab(D, S.tab), ygTxt = yg === null ? esc(S.tab) : yg > 11 ? esc(S.tab) : 'Year ' + yg;
    var scopeTxt = id === 'balance' ? ygTxt + ' · ' + (S.k ? esc(famName(S.k)) : 'all its tests') + ' · the papers, not the pupils'
                 : ygTxt + (S.c ? ', class ' + esc(S.c) : '') + ' · ' + (S.k ? esc(famName(S.k)) : 'all assessments') +
                   ' · data from ' + A.cov.withData.length + ' of ' + pl(A.cov.classes.length, 'class', 'classes');
    var showT = !!S.table[id], h = '', fig = '', tab = '';
    var waitNote = !A.kinds.self ? '' : A.own ? ' This includes ' + pl(A.kinds.self, 'paper') + ' with only the pupils’ own marks.' : ' ⏳ ' + pl(A.kinds.self, 'paper') + ' with only the pupils’ own marks ' + (A.kinds.self === 1 ? 'is' : 'are') + ' left out.';
    var countedRule = 'Counts the papers a teacher marked, and the papers where the teacher typed the totals and the pupil gave each question’s marks: both are trusted. ' +
      (A.own ? 'The switch is ON, so papers with only the pupil’s own marks are counted too.' : 'Papers with only the pupil’s own marks are left out (“⏳ not yet marked”) unless you turn on the switch above.');
    var pbits = (A.cov.missing.length ? [A.cov.missing.join(', ') + (A.cov.missing.length === 1 ? ' has' : ' have') + ' no data here yet'] : []).concat(A.cov.gaps);
    var partial = pbits.length && id !== 'cover' && id !== 'balance' ? '<p class="partial">Not complete: ' + esc(pbits.join('; ')) + '.</p>' : '';
    var emptyMsg = '';
    if (!A.rows.length && id !== 'cover' && id !== 'balance') emptyMsg = '<p class="empty">Nobody here has finished a reflection yet, so there is nothing to show. “Which classes have data yet?” shows who has.</p>';
    else if (SCORE_Q[id] && !A.counted.length) emptyMsg = '<p class="empty">No marked papers here yet.' +
      (A.kinds.self ? ' ' + A.kinds.self + ' paper' + (A.kinds.self === 1 ? ' has' : 's have') + ' only the pupils’ own marks. Turn on the switch above to include them, or wait for the teacher’s marks.' : '') + '</p>';
    if (emptyMsg) h = emptyMsg;
    else if (id === 'cover') {
      var cv = A.cov, ownTxt = A.own ? ' (their own marks count: the switch is on)' : '';
      h = '<p class="answer"><b>' + cv.withData.length + ' of ' + cv.classes.length + '</b> ' + (cv.classes.length === 1 ? 'class has' : 'classes have') + ' data' + (S.k ? ' for ' + esc(famName(S.k)) : '') + ownTxt + '.' +
        (cv.missing.length ? ' <b>' + esc(cv.missing.join(', ')) + '</b> ' + (cv.missing.length === 1 ? 'has' : 'have') + ' none yet, so every number on this page is for the other classes only.' : '') +
        (cv.gaps.length ? ' Not complete yet: ' + esc(cv.gaps.join('; ')) + '.' : cv.missing.length || !cv.classes.length ? '' : ' Every class is in.') + '</p>';
      if (!cv.keys.length) h += '<p class="empty">No assessment in this year group has a reflection yet.</p>';
      else {
        h += '<div class="legend" style="margin-top:14px"><span><i style="background:var(--s1)"></i>marked by a teacher</span><span><i style="background:var(--s2)"></i>only the pupils’ own marks</span><span><i style="background:#22323C"></i>no reflection yet</span></div>';
        h += tableHtml('Table 1. Data showing, for each class and assessment, how many pupils have a marked paper and how many have only their own marks, out of the pupils the tracker has seen in the class.',
          ['Class', 'Pupils'].concat(cv.keys.map(function (k) { return esc(famShort(k)); })),
          cv.classes.map(function (c) {
            return ['<b>' + esc(c) + '</b>' + (cv.has[c] ? '' : ' <span class="few">no data yet</span>'), +cv.roster[c] || '—'].concat(cv.keys.map(function (k) {
              var x = cv.cells[c][k], n = x.roster || Math.max(1, x.marked + x.own), none = Math.max(0, x.roster - x.marked - x.own);
              if (!x.marked && !x.own) return '<div class="cell"><div class="cell__bar"></div><small>not started</small></div>';
              return '<div class="cell"><div class="cell__bar">' + (x.marked ? '<span style="width:' + (x.marked / n * 100).toFixed(1) + '%;background:var(--s1)"></span>' : '') +
                (x.own ? '<span style="width:' + (x.own / n * 100).toFixed(1) + '%;background:var(--s2)"></span>' : '') + '</div><small>' + x.marked + ' marked' + (x.own ? ' · ' + x.own + ' own marks' : '') + (none ? ' · ' + none + ' none' : '') + '</small></div>';
            }));
          }), [0, 1].concat(cv.keys.map(function () { return 0; })));
      }
      h += how(['The classes are the ones the tracker has seen for this year group, and the pupils seen in each, from the tracker alone. A class that has done one assessment but not the next shows as “not started”. An assessment appears once one pupil of the year group has reflected on it.',
        'A pupil appears here once they finish a reflection. “Marked” means a teacher marked the paper, or typed its totals.',
        'Every other answer on this page says how many classes it rests on, so a number from two classes is never read as the whole year.',
        'Not in the old tabs: they could not tell a missing class from a class that does not exist.']);
    }
    else if (id === 'grades') {
      var gr = GRADES.map(function (g) { return { l: g, v: A.grades[g], col: gradeBand(g).c, tip: '<b>Grade ' + g + '</b><br>' + A.grades[g] + ' papers (' + (A.nScored ? Math.round(A.grades[g] / A.nScored * 100) : 0) + ' %)' }; });
      h = '<p class="answer">The mean score is <b>' + rnd(A.meanPct) + ' %</b>. <b>' + rnd(A.cOrBetter) + ' %</b> of papers reached grade C or better.' + waitNote + '</p>';
      var wide = root.matchMedia('(min-width:1100px)').matches, side = S.bEdit && S.k && !showT && wide, ed = '';
      if (S.k) {
        var fam = D.fams[S.k], vers = fam ? fam.ids.filter(function (x) { return !!D.reg[x]; }) : [];
        h += '<div class="tools"><button class="btn" data-bedit' + (vers.length ? '' : ' disabled') + '>' + (S.bEdit ? 'Close the grade boundaries' : 'Change grade boundaries') + '</button></div>';
        if (!vers.length) h += '<p class="tcap">This assessment is not in the 📦 Registry, so it has no grade boundaries of its own.</p>';
        if (S.bEdit && vers.length) ed = boundsEditor(fam, vers);
      }
      fig = '<figure class="fig">' + bandLegend('grades') + vbars(gr, { w: side ? W - 410 : W, aria: 'Number of papers at each grade' }) + '<figcaption>Figure 1. Bar chart showing the number of papers at each grade (n = ' + pl(A.nScored, 'paper') + '). ' + boundsLine(A) + '</figcaption></figure>';
      tab = tableHtml('Table 1. Data showing the number and percentage of papers at each grade.', ['Grade', 'Papers', '% of papers'],
        gr.map(function (g) { return [g.l, g.v, A.nScored ? Math.round(g.v / A.nScored * 100) + ' %' : '—']; }), [0, 1, 1]);
      h += side ? '<div class="bwrap">' + fig + ed + '</div>' : ed + (showT ? tab : fig);
      if (!S.k) h += '<p class="tcap" style="margin-top:12px">To change grade boundaries, choose one assessment above. Each test keeps its own; this view only reads them.</p>';
      h += how([countedRule, 'Each paper is graded on its own version’s boundaries: the ones saved in the tracker’s 🎯 Grade boundaries tab; otherwise the annual ones stored in its 📦 Registry; otherwise the default IGCSE boundaries. ' + boundsLine(A),
        'The mean is the average of each paper’s own percentage, so papers out of 50 and out of 100 weigh the same. <b>Changed from the old tab</b>, which averaged raw marks.',
        'From the old tracker tab “📊 Analysis”, sections 1 and 2.']);
    }
    else if (id === 'topics') {
      var tr = A.topics.map(function (t) { return { l: t.l, v: t.v, col: bandCol(t.v), tip: '<b>' + esc(t.l) + '</b><br>' + rnd(t.v) + ' % of marks scored (' + Math.round(t.s * 10) / 10 + ' of ' + Math.round(t.a * 10) / 10 + ')' + (t.m !== null ? '<br>multiple choice ' + rnd(t.m) + ' %' : '') + (t.w !== null ? ' · written ' + rnd(t.w) + ' %' : '') }; });
      h = A.topics.length ? '<p class="answer">The hardest topic was <b>' + esc(A.topics[0].l) + '</b>: pupils scored <b>' + rnd(A.topics[0].v) + ' %</b> of its marks. The easiest was ' + esc(A.topics[A.topics.length - 1].l) + ' (' + rnd(A.topics[A.topics.length - 1].v) + ' %).' + waitNote + '</p>' : '<p class="empty">No topic marks yet: they are built when each pupil’s reflection is handed in.</p>';
      fig = A.topics.length ? '<figure class="fig">' + bandLegend('pct') + hbars(tr, { w: W, unit: ' %', aria: 'Percentage of marks scored in each topic' }) + '<figcaption>Figure 1. Bar chart showing the percentage of marks scored in each topic, hardest first (multiple-choice and written marks together).</figcaption></figure>' : '';
      tab = tableHtml('Table 1. Data showing the marks scored in each topic.', ['Topic', 'Marks scored', 'Marks available', '% scored', 'Multiple choice %', 'Written %'],
        A.topics.map(function (t) { return [esc(t.l), Math.round(t.s * 10) / 10, Math.round(t.a * 10) / 10, rnd(t.v) + ' %', t.m !== null ? rnd(t.m) + ' %' : '—', t.w !== null ? rnd(t.w) + ' %' : '—']; }), [0, 1, 1, 1, 1, 1]);
      h += (showT ? tab : fig) + how([countedRule, 'A topic’s percentage is all the marks scored on it divided by all the marks available on it, multiple choice and written together.', 'Colours, as in the old tracker tabs: 75 % or more, 50–74 %, below 50 %.', 'From the old tab, section 3 (“Topic Difficulty”).']);
    }
    else if (id === 'progress') {
      if (A.keys.length < 2) {
        h = '<p class="answer">Progress needs two or more assessments. ' + (S.k ? 'You chose one.' : 'This year group has one so far.') + '</p>' + (S.k ? '<div class="tools"><button class="btn btn--solid" data-all>Show all assessments</button></div>' : '');
      } else {
        var pr = A.progress.slice().sort(function (a, b) { return (a.delta === null) - (b.delta === null) || (a.delta - b.delta) || a.name.localeCompare(b.name); });
        var up = pr.filter(function (p) { return p.delta !== null && p.delta > 2; }).length, dn = pr.filter(function (p) { return p.delta !== null && p.delta < -2; }).length;
        h = '<p class="answer"><b>' + up + '</b> pupil' + (up === 1 ? '' : 's') + ' went up by more than 2 points since the assessment before; <b>' + dn + '</b> went down by more than 2. The pupils who went down most are at the top.</p>';
        h += bandLegend('pct') + tableHtml('Table 1. Data showing each pupil’s percentage in each assessment, in date order, and the change since the assessment before.',
          ['Pupil', 'Class'].concat(A.keys.map(function (k) { return esc(famShort(k)); })).concat(['Trend', 'Change', 'Their own forecast']),
          pr.map(function (p) {
            var vals = A.keys.map(function (k) { return p.by[k] ? p.by[k].pct : null; });
            return [esc(p.name || '—'), esc(p.cls)].concat(A.keys.map(function (k) { var x = p.by[k]; return !x ? '—' : x.wait ? '<span class="nym">⏳ not yet marked</span>' : x.pct === null ? '—' : '<span class="pchip pchip--' + band(x.pct).k + '">' + x.pct + ' %</span>' + (x.own ? ' <span class="nym">own marks</span>' : ''); }))
              .concat([spark(vals), deltaBar(p.delta), esc(p.cal || '—')]);
          }), [0, 0].concat(A.keys.map(function () { return 1; })).concat([0, 0, 0]));
        h += how([countedRule + ' A not-yet-marked paper shows ⏳ and is skipped when the change is worked out.', 'Change = the latest whole percentage minus the one before it, in points. More than 2 up is ▲; more than 2 down is ▼.',
          '“Their own forecast”: the pupil’s predicted total in their reflection, against the real one in their latest marked assessment. Within 2 marks (or 5 % of the paper) is “Spot on”.',
          'Pupils are shown by name and class (their latest class). Behind the scenes the server joins each pupil’s papers with a code made from their school account, so the email never leaves the tracker and two pupils with the same name stay apart.',
          'From the old tab “📈 Progression”.']);
      }
    }
    else if (id === 'classes') {
      var cr = A.classes.map(function (c) { return { l: 'Class ' + c.l, sub: c.n + ' paper' + (c.n === 1 ? '' : 's') + (c.n < 5 ? ' · few papers, read with care' : ''), v: c.v, col: bandCol(c.v), tip: '<b>Class ' + esc(c.l) + '</b><br>mean ' + rnd(c.v) + ' % · ' + rnd(c.cb) + ' % at C or better<br>' + c.n + ' papers' }; })
        .concat(A.cov.missing.map(function (c) { return { l: 'Class ' + c, sub: 'no data yet', v: 0, text: '—', tip: '<b>Class ' + esc(c) + '</b><br>no marked papers yet' }; }));
      h = A.classes.length === 1 ? '<p class="answer">Only class ' + esc(A.classes[0].l) + ' has marked papers here: mean <b>' + rnd(A.classes[0].v) + ' %</b>. There is nothing to compare it with yet.' + waitNote + '</p>'
        : '<p class="answer">Class means run from <b>' + rnd(Math.min.apply(null, A.classes.map(function (c) { return c.v; }))) + ' %</b> to <b>' + rnd(Math.max.apply(null, A.classes.map(function (c) { return c.v; }))) + ' %</b>.' + waitNote + '</p>';
      var tks = A.topics.map(function (t) { return t.k; });
      fig = '<figure class="fig">' + bandLegend('pct') + hbars(cr, { w: W, unit: ' %', aria: 'Mean percentage in each class' }) + '<figcaption>Figure 1. Bar chart showing the mean percentage in each class.</figcaption></figure>' +
        (tks.length ? '<div class="tw heat"><table><thead><tr><th>Topic</th>' + A.classes.map(function (c) { return '<th class="n">' + esc(c.l) + '</th>'; }).join('') + '</tr></thead><tbody>' +
        tks.map(function (t) {
          return '<tr><td>' + esc(topicLabelOf(t)) + '</td>' + A.classes.map(function (c) {
            var x = c.tp[t]; if (!x || !x[1]) return '<td class="h">—</td>';
            var v = x[0] / x[1] * 100; return '<td class="h" style="background:' + band(v).t + '">' + Math.round(v) + '</td>';
          }).join('') + '</tr>';
        }).join('') + '</tbody></table></div><p class="tcap">Table 1. Data showing the percentage of marks scored in each topic by each class, each cell in its band (75 % or more, 50–74 %, below 50 %).</p>' : '');
      tab = tableHtml('Table 1. Data showing each class’s mean percentage and the share at grade C or better.', ['Class', 'Papers', 'Mean %', 'C or better'],
        A.classes.map(function (c) { return [esc(c.l), c.n, rnd(c.v) + ' %', rnd(c.cb) + ' %']; }), [0, 1, 1, 1]);
      h += (showT ? tab : fig) + how([countedRule, 'A class’s mean is the average of its papers’ own percentages. Fewer than 5 papers: “few papers, read with care”.', 'Colours, as in the old tracker tabs: 75 % or more, 50–74 %, below 50 %.', 'Not in the old tabs.']);
    }
    else if (id === 'sections') {
      var sr = A.sections.map(function (s) { return { l: s.l, v: s.v, col: bandCol(s.v), tip: '<b>' + esc(s.l) + '</b><br>mean ' + rnd(s.v) + ' % (' + s.n + ' papers)' }; });
      var lo = A.sections.slice().sort(function (a, b) { return a.v - b.v; })[0];
      h = !lo ? '<p class="empty">No marked papers with their parts recorded here yet.</p>' : '<p class="answer">Pupils lost the most in <b>' + esc(lo.l.toLowerCase()) + '</b>: a mean of <b>' + rnd(lo.v) + ' %</b>.' + waitNote + '</p>';
      fig = lo ? '<figure class="fig">' + bandLegend('pct') + hbars(sr, { w: W, unit: ' %', aria: 'Mean percentage in each part of the paper' }) + '<figcaption>Figure 1. Bar chart showing the mean percentage scored in each part of the paper.</figcaption></figure>' : '';
      tab = tableHtml('Table 1. Data showing the mean percentage in each part of the paper.', ['Part', 'Papers', 'Mean %'], A.sections.map(function (s) { return [esc(s.l), s.n, rnd(s.v) + ' %']; }), [0, 1, 1]);
      h += (showT ? tab : fig) + how([countedRule, 'Each paper’s part is turned into its own percentage first, then averaged.', 'Section B and Section C appear separately only when both exist.', 'Colours, as in the old tracker tabs: 75 % or more, 50–74 %, below 50 %.', 'From the old tab, section 2 (“Score Breakdown”).']);
    }
    else if (id === 'cmds') {
      var cm = A.cmds.map(function (c) { return { l: c.l, v: c.v, col: bandCol(c.v), tip: '<b>' + esc(c.l) + '</b><br>' + rnd(c.v) + ' % of marks (' + Math.round(c.s * 10) / 10 + ' of ' + Math.round(c.a * 10) / 10 + ')' }; });
      h = !A.cmds.length ? '<p class="empty">No marked written questions here yet.</p>' : '<p class="answer">Questions that start with <b>' + esc(A.cmds[0].l) + '</b> lost the most: pupils scored <b>' + rnd(A.cmds[0].v) + ' %</b> of their marks.' + waitNote + '</p>';
      fig = A.cmds.length ? '<figure class="fig">' + bandLegend('pct') + hbars(cm, { w: W, unit: ' %', aria: 'Percentage of marks scored for each command word' }) + '<figcaption>Figure 1. Bar chart showing the percentage of marks scored for each command word, hardest first.</figcaption></figure>' : '';
      tab = tableHtml('Table 1. Data showing the marks scored for each command word.', ['Command word', 'Marks scored', 'Marks available', '% scored'], A.cmds.map(function (c) { return [esc(c.l), Math.round(c.s * 10) / 10, Math.round(c.a * 10) / 10, rnd(c.v) + ' %']; }), [0, 1, 1, 1]);
      h += (showT ? tab : fig) + how([countedRule, 'Written questions only: each question’s command word comes from the assessment’s map.', 'Colours, as in the old tracker tabs: 75 % or more, 50–74 %, below 50 %.', 'From the old tab, section 4 (“Command Word Performance”).']);
    }
    else if (id === 'mcq') {
      var mr = A.mcq.map(function (m) { return { l: m.l, sub: m.sub, v: m.v, col: bandCol(100 - m.v), tip: '<b>' + esc(m.l) + '</b>' + (m.sub ? '<br>' + esc(m.sub) : '') + '<br>' + (m.of ? m.c + ' of ' + m.of + ' answers wrong' : m.c + ' of ' + A.mcqDen + ' pupils wrong') }; });
      h = !A.mcq.length ? '<p class="empty">No marked multiple-choice answers here yet.</p>' : '<p class="answer">' + (A.mcqByTopic ? 'Across several papers, question numbers mean different questions, so this shows <b>topics</b>. ' : '') +
        'The most missed: <b>' + esc(A.mcq[0].l) + '</b>, wrong in <b>' + rnd(A.mcq[0].v) + ' %</b> of ' + (A.mcqByTopic ? 'answers' : 'pupils’ answers') + '.' + waitNote + '</p>';
      fig = A.mcq.length ? '<figure class="fig">' + bandLegend('wrong') + hbars(mr, { w: W, unit: ' %', aria: 'Percentage wrong' }) + '<figcaption>Figure 1. Bar chart showing the percentage of ' + (A.mcqByTopic ? 'multiple-choice answers on each topic that were wrong' : 'pupils who got each multiple-choice question wrong') + ' (the ten worst; n = ' + pl(A.mcqDen, 'pupil') + ').</figcaption></figure>' : '';
      tab = tableHtml('Table 1. Data showing the multiple-choice ' + (A.mcqByTopic ? 'topics' : 'questions') + ' most often wrong.', [A.mcqByTopic ? 'Topic' : 'Question', 'Wrong answers', A.mcqByTopic ? '% of answers' : '% of pupils'], A.mcq.map(function (m) { return [esc(m.l) + (m.sub ? ' · ' + esc(m.sub) : ''), m.c + (m.of ? ' of ' + m.of : ''), rnd(m.v) + ' %']; }), [0, 1, 1]);
      h += (showT ? tab : fig) + how([countedRule, 'One paper version: by question number, out of the pupils whose answers were recorded. Several: by topic, out of all the answers given on that topic.', '<b>Changed from the old tab:</b> across several papers it divided wrong answers by pupils, which can pass 100 %.', 'Colours by the share answered right: 75 % or more, 50–74 %, below 50 % (so more wrong is redder).', 'From the old tab, section 5.']);
    }
    else if (id === 'errors') {
      if (!A.errTotal) h = '<p class="empty">No reasons yet: pupils give one for each question where they lost marks.</p>';
      else {
        var er = A.errors.map(function (e) { return { l: e.l, sub: e.sub, v: e.v, tip: '<b>' + esc(e.l) + '</b><br>' + e.n + ' times (' + rnd(e.v) + ' % of all reasons)' }; });
        var emax = Math.max(50, Math.ceil(A.errors[0].v / 10) * 10);
        h = '<p class="answer">The reason pupils gave most often was <b>' + esc(A.errors[0].l.replace(/^\S+ /, '').toLowerCase()) + '</b> (' + rnd(A.errors[0].v) + ' % of ' + pl(A.errTotal, 'reason') + '), then ' + esc(A.errors[1].l.replace(/^\S+ /, '').toLowerCase()) + ' (' + rnd(A.errors[1].v) + ' %).</p>';
        fig = '<figure class="fig">' + hbars(er, { w: W, unit: ' %', max: emax, ticks: [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].filter(function (t) { return t <= emax; }), aria: 'Share of each reason for lost marks' }) + '<figcaption>Figure 1. Bar chart showing the percentage of all lost-mark reasons that pupils gave for each error type (n = ' + pl(A.errTotal, 'reason') + ').</figcaption></figure>';
        tab = tableHtml('Table 1. Data showing how often pupils gave each reason for lost marks.', ['Reason', 'Times', '% of reasons'], A.errors.map(function (e) { return [esc(e.l), e.n, rnd(e.v) + ' %']; }), [0, 1, 1]);
        h += (showT ? tab : fig);
      }
      h += how(['Counts every reflection, marked or not: these are the pupils’ own answers, not scores.', 'For each question where they lost marks, pupils chose a reason (the eight error codes of the reflection form).', 'From the old tab, section 4 (“Error Pattern Breakdown”).']);
    }
    else if (id === 'vocab') {
      h = A.vocab.length ? '<p class="answer"><b>“' + esc(A.vocab[0].l) + '”</b> was the keyword pupils most often did not know: ' + A.vocab[0].dk + ' did not know it and ' + A.vocab[0].pa + ' partly knew it.</p>' : '<p class="empty">No keyword data yet.</p>';
      fig = A.vocab.length ? '<figure class="fig"><div class="legend"><span><i style="background:var(--s2)"></i>did not know</span><span><i style="background:var(--s1)"></i>partly knew</span></div>' +
        stacked(A.vocab, { w: W, aria: 'Keywords pupils did not know or partly knew' }) + '<figcaption>Figure 1. Bar chart showing the number of pupils who did not know, or partly knew, each keyword (the twelve most often flagged).</figcaption></figure>' : '';
      tab = tableHtml('Table 1. Data showing the keywords pupils flagged in their reflections.', ['Keyword', 'Did not know', 'Partly knew', '% of reflections'], A.vocab.map(function (v) { return [esc(v.l), v.dk, v.pa, rnd(v.pc) + ' %']; }), [0, 1, 1, 1]);
      h += (A.vocab.length ? (showT ? tab : fig) : '') + how(['Counts every reflection: each pupil checked the keywords of the paper on the reflection form. Each pupil’s paper counts once.', 'Order: “did not know” counts 1, “partly knew” counts ½.', 'From the old tab “📚 Vocab Heatmap”.']);
    }
    else if (id === 'timing') {
      var tm = A.timing.filter(function (t) { return t.n; });
      if (!A.timingN) h = '<p class="empty">No answers yet.</p>';
      else {
        h = '<p class="answer"><b>' + rnd(A.timing[0].share) + ' %</b> of pupils said they revised all through the year' +
          (A.timing[0].m !== null ? '; their mean score was <b>' + rnd(A.timing[0].m) + ' %</b>' : '') + '.' +
          (A.timing[2].m !== null ? ' Those who revised only just before scored ' + rnd(A.timing[2].m) + ' %.' : '') + '</p>';
        var half = root.matchMedia('(min-width:900px)').matches ? (PI - 24) / 2 - CARD : W;
        fig = '<div style="display:flex;flex-wrap:wrap;gap:24px">' +
          '<figure class="fig" style="flex:1 1 ' + Math.round(half) + 'px;min-width:0">' + hbars(tm.map(function (t) { return { l: t.l, v: t.share, tip: '<b>' + esc(t.l) + '</b><br>' + t.n + ' pupils (' + rnd(t.share) + ' %)' }; }), { w: Math.round(half), unit: ' %', aria: 'Share of pupils for each revision pattern' }) +
            '<figcaption>Figure 1. Bar chart showing the percentage of pupils who chose each revision pattern (n = ' + A.timingN + ').</figcaption></figure>' +
          '<figure class="fig" style="flex:1 1 ' + Math.round(half) + 'px;min-width:0">' + bandLegend('pct') + hbars(tm.map(function (t) { return { l: t.l, v: t.m || 0, col: bandCol(t.m), text: t.m === null ? '—' : rnd(t.m) + ' %', tip: '<b>' + esc(t.l) + '</b><br>mean ' + rnd(t.m) + ' % (' + t.np + ' marked papers)' }; }), { w: Math.round(half), unit: ' %', aria: 'Mean score for each revision pattern' }) +
            '<figcaption>Figure 2. Bar chart showing the mean percentage scored for each revision pattern (marked papers only).</figcaption></figure></div>';
        tab = tableHtml('Table 1. Data showing each revision pattern, how many chose it and their mean score.', ['When they revised', 'Pupils', '% of pupils', 'Mean score'], tm.map(function (t) { return [esc(t.l), t.n, rnd(t.share) + ' %', t.m === null ? '—' : rnd(t.m) + ' %']; }), [0, 1, 1, 1]);
        h += (showT ? tab : fig);
      }
      h += how(['The share counts every reflection. The mean score counts marked papers only.', '<b>Changed from the old tab:</b> the old “Revision Timing” averaged raw marks across papers with different totals; this uses each paper’s percentage.', 'Pupils answer this question on the reflection form. It shows a link, not a cause.', 'From the old tab, section 5.']);
    }
    else if (id === 'balance') {
      h = balancePanel(W, showT);
    }
    else if (id === 'bvg') {
      var g = A.girls, b = A.boys, f1 = function (v) { return v === null ? '—' : v.toFixed(1); }, d1 = function (x, y) { return x === null || y === null ? '—' : (x - y).toFixed(1); },
        dp = function (x, y) { return x === null || y === null ? '—' : rnd(x - y) + ' points'; }, pc = function (v) { return v === null ? '—' : rnd(v) + ' %'; };
      var noG = A.noGender.length ? '<p class="partial">No gender set yet for ' + esc(A.noGender.join(', ')) + ': set it with 🚻 Set class gender… in that class’s reflection spreadsheet. Until then those classes are left out here.</p>' : '';
      if (!g.n && !b.n) h = noG + '<p class="empty">No class in this choice has a gender yet. The tracker learns a class’s gender when 🚻 Set class gender… is used in a reflection spreadsheet with the newest build (it writes the tracker’s 🚻 Class genders tab).</p>';
      else {
        h = noG + (!g.nc || !b.nc ? '<p class="answer">No ' + (!g.nc ? 'girls’' : 'boys’') + ' classes have marked papers here yet, so there is nothing to compare.</p>'
          : '<p class="answer">Girls’ mean: <b>' + rnd(g.mean) + ' %</b>. Boys’ mean: <b>' + rnd(b.mean) + ' %</b>.' + waitNote + '</p>');
        fig = '<figure class="fig"><div class="legend"><span><i style="background:var(--s1)"></i>girls</span><span><i style="background:var(--s2)"></i>boys</span></div>' +
          dots([{ l: 'Mean score', g: g.mean, b: b.mean }, { l: 'Grade A* or A', g: g.top, b: b.top }, { l: 'Below grade C', g: g.low, b: b.low }]
            .concat(ERR.slice(0, 4).map(function (e, i) { return { l: e.e + ' ' + e.l + ' (share of reasons)', g: g.n ? g.err[i] : null, b: b.n ? b.err[i] : null }; })), { w: W, aria: 'Girls and boys compared' }) +
          '<figcaption>Figure 1. Dot plot showing girls’ and boys’ results and four of their reasons for lost marks.</figcaption></figure>';
        tab = tableHtml('Table 1. Data showing girls’ and boys’ results side by side.', ['', 'Girls', 'Boys', 'Difference (girls − boys)'],
          [['Papers', g.n, b.n, ''], ['Marked papers', g.nc, b.nc, ''], ['Mean score', pc(g.mean), pc(b.mean), dp(g.mean, b.mean)], ['Grade A* or A', pc(g.top), pc(b.top), dp(g.top, b.top)],
           ['Below grade C', pc(g.low), pc(b.low), dp(g.low, b.low)], ['English level (1–4)', f1(g.eng), f1(b.eng), d1(g.eng, b.eng)], ['Confidence (1–5)', f1(g.conf), f1(b.conf), d1(g.conf, b.conf)]], [0, 1, 1, 1]);
        h += (showT ? tab : fig);
      }
      h += how(['Scores: marked papers only. English level, confidence and reasons: every reflection.', 'A class counts as girls or boys by its gender, set once per class (the tracker’s 🚻 Class genders tab).', 'From the old tab “📊 B vs G”.']);
    }
    var hasChart = !emptyMsg && id !== 'cover' && id !== 'progress' && fig;
    if (hasChart || (id === 'balance' && S.bvHas)) h += '<div class="tools"><button class="btn" data-table>' + (showT ? 'Show the chart' : 'Show as a table') + '</button></div>';
    el.innerHTML = '<h2 class="sr-only">' + item.t + '</h2>' + pickerHtml(A) + '<p class="eyebrow scope-line">' + scopeTxt + '</p>' + kpiHtml(kpisFor(id, A)) + partial + h;
  }
  /* The question picker (Daniel, 1 Oct 2026: the browser's own dropdown looked clunky). A button with the question's
     number and title opens a menu in the page's own style: the five groups in two columns, each question with its
     one-line answer under it. ‹ and › step through the questions. Escape or a click outside closes it. */
  function shortAnswer(id, A) {
    if (id === 'balance') { var bt = balanceTests(); return bt.mapped ? bt.flagged + ' of ' + pl(bt.mapped, 'paper') + ' to look at' : 'No question maps yet'; }
    if (id !== 'cover' && !A.rows.length) return 'No reflections yet';
    if (SCORE_Q[id] && !A.counted.length) return 'No marked papers yet';
    switch (id) {
      case 'cover': return A.cov.withData.length + ' of ' + pl(A.cov.classes.length, 'class', 'classes') + (A.cov.missing.length ? ' · ' + A.cov.missing.join(', ') + ' none yet' : A.cov.gaps.length ? ' · ' + A.cov.gaps.length + ' gap' + (A.cov.gaps.length > 1 ? 's' : '') : ' · all in');
      case 'grades': return 'Mean ' + rnd(A.meanPct) + ' % · ' + rnd(A.cOrBetter) + ' % at C or better';
      case 'topics': return A.topics.length ? 'Hardest: ' + A.topics[0].l.replace(/^\d+ /, '') + ', ' + rnd(A.topics[0].v) + ' %' : 'No topic marks yet';
      case 'progress':
        var up = A.progress.filter(function (p) { return p.delta !== null && p.delta > 2; }).length, dn = A.progress.filter(function (p) { return p.delta !== null && p.delta < -2; }).length;
        return A.keys.length < 2 ? 'Needs two assessments' : up + ' up · ' + dn + ' down';
      case 'classes': var c = A.classes.slice().sort(function (a, b) { return a.v - b.v; }); return c.length > 1 ? 'From ' + rnd(c[0].v) + ' % to ' + rnd(c[c.length - 1].v) + ' %' : c.length ? 'One class so far' : '—';
      case 'sections': return A.sections.map(function (s) { return (s.l.indexOf('Multiple') === 0 ? 'MCQ' : s.l.split(' (')[0]) + ' ' + rnd(s.v) + ' %'; }).join(' · ') || '—';
      case 'cmds': return A.cmds.length ? 'Hardest: ' + A.cmds[0].l + ', ' + rnd(A.cmds[0].v) + ' %' : 'No command words yet';
      case 'mcq': return A.mcq.length ? (A.mcqByTopic ? A.mcq[0].l.replace(/^\d+ /, '') : A.mcq[0].l.replace('Question ', '')) + ': ' + rnd(A.mcq[0].v) + ' % wrong' : 'No answers recorded yet';
      case 'errors': return A.errTotal ? A.errors[0].l.replace(/^\S+ /, '') + ' ' + rnd(A.errors[0].v) + ' %' : 'No reasons given yet';
      case 'vocab': return A.vocab.length ? '“' + A.vocab[0].l + '” most often' : 'No keywords flagged yet';
      case 'timing': return A.timingN ? rnd(A.timing[0].share) + ' % revised all year' : 'No answers yet';
      case 'bvg': return A.girls.nc && A.boys.nc ? 'Mean: girls ' + rnd(A.girls.mean) + ' % · boys ' + rnd(A.boys.mean) + ' %' : !A.girls.n && !A.boys.n ? 'No class genders yet' : 'Only ' + (A.girls.nc ? 'girls’' : 'boys’') + ' classes so far';
    }
    return '';
  }
  function pickerHtml(A) {
    var n = 0, cur = null, num = function (x) { return (x < 10 ? '0' : '') + x; };
    QUESTIONS.forEach(function (g) { g.items.forEach(function (it) { it.n = ++n; if (it.id === S.q) cur = it; }); });
    return '<div class="qbar"><button class="qstep" data-qstep="-1" aria-label="The question before">‹</button>' +
      '<button class="qpick" id="qpick" aria-haspopup="listbox" aria-expanded="false" aria-controls="qpop"><span class="qpick__n">' + num(cur.n) + '</span>' +
        '<span class="qpick__t">' + esc(cur.t) + '</span><svg class="qpick__chev" viewBox="0 0 12 8" aria-hidden="true"><path d="M1 1l5 5 5-5" fill="none" stroke="currentColor" stroke-width="1.6"/></svg></button>' +
      '<button class="qstep" data-qstep="1" aria-label="The next question">›</button>' +
      '<div class="qpop" id="qpop" role="listbox" aria-label="Questions" hidden>' + QUESTIONS.map(function (g) {
        return '<div class="qpop__grp"><p class="qpop__gl">' + esc(g.group) + ' <span>· ' + esc(g.note) + '</span></p>' + g.items.map(function (it) {
          return '<button class="qopt" role="option" data-qopt="' + it.id + '" aria-selected="' + (it.id === S.q) + '"><span class="qopt__n">' + num(it.n) + '</span>' +
            '<span class="qopt__t">' + esc(it.t) + '</span><span class="qopt__a">' + esc(shortAnswer(it.id, A)) + '</span></button>';
        }).join('') + '</div>';
      }).join('') + '</div></div>';
  }
  function pickerOpen(open) {
    var pop = doc.getElementById('qpop'), btn = doc.getElementById('qpick');
    if (!pop || !btn) return;
    pop.hidden = !open; btn.setAttribute('aria-expanded', String(!!open));
    if (open) { var sel = pop.querySelector('[aria-selected="true"]') || pop.querySelector('.qopt'); if (sel) sel.focus(); }
  }
  /* The few numbers that matter, as large figures above the chart (Daniel, 1 Oct 2026: "the most important thing is to
     see the data"). Each is the same number the sentence and the chart give. */
  function kpisFor(id, A) {
    var k = function (v, l, warn, pct) { return { v: String(v), l: l, warn: !!warn, band: pct === undefined || pct === null || isNaN(pct) ? null : band(pct) }; }, out = [];
    if (id === 'balance') {
      var bt = balanceTests();
      if (!bt.mapped) return [];
      if (bt.tests.length === 1) {
        var t = bt.tests[0], b = t.bs[t.ids.indexOf(S.bv)] || t.bs.filter(Boolean)[0];
        out = [k(rnd(b.ownPct) + ' %', 'on its own topics', b.ownPct < Balance.LIMITS.ownShare), k(b.subsHit + ' / ' + b.subs.length, 'sub-topics with marks', b.subsHit < b.subs.length), k(rnd(b.ao3Pct) + ' %', 'AO3 practical skills')];
        if (t.vc) out.push(k(t.vc.flagged.length ? '⚠ ' + t.vc.flagged.length : '✓', t.vc.flagged.length ? 'rows where versions differ' : 'versions match', t.vc.flagged.length > 0));
      } else out = [k(bt.mapped, bt.mapped === 1 ? 'paper mapped' : 'papers mapped'), k(bt.flagged, 'to look at', bt.flagged > 0)];
    }
    else if (id === 'cover') out = [k(A.cov.withData.length + ' / ' + A.cov.classes.length, 'classes with data', A.cov.missing.length > 0), k(A.nPupils, A.nPupils === 1 ? 'pupil' : 'pupils'),
      k(A.kinds.teacher + A.kinds.partly, A.kinds.teacher + A.kinds.partly === 1 ? 'marked paper' : 'marked papers')].concat(A.kinds.self ? [k(A.kinds.self, 'with only the pupils’ own marks', true)] : []);
    else if (!A.rows.length || (SCORE_Q[id] && !A.counted.length)) out = [];
    else if (id === 'grades') out = [k(rnd(A.meanPct) + ' %', 'mean score', false, A.meanPct), k(rnd(A.cOrBetter) + ' %', 'at grade C or better'), k(A.nScored, A.nScored === 1 ? 'paper' : 'papers')];
    else if (id === 'topics' && A.topics.length > 1) out = [k(rnd(A.topics[0].v) + ' %', 'hardest: ' + A.topics[0].l, false, A.topics[0].v), k(rnd(A.topics[A.topics.length - 1].v) + ' %', 'easiest: ' + A.topics[A.topics.length - 1].l, false, A.topics[A.topics.length - 1].v)];
    else if (id === 'progress' && A.keys.length > 1) {
      var up = A.progress.filter(function (p) { return p.delta !== null && p.delta > 2; }).length, dn = A.progress.filter(function (p) { return p.delta !== null && p.delta < -2; }).length;
      out = [k('▲ ' + up, 'went up by more than 2 points'), k('▼ ' + dn, 'went down by more than 2 points', dn > 0)];
    }
    else if (id === 'classes' && A.classes.length > 1) {
      var cs = A.classes.slice().sort(function (a, b) { return a.v - b.v; }), lo = cs[0], hi = cs[cs.length - 1];
      out = [k(rnd(hi.v) + ' %', 'highest: class ' + hi.l, false, hi.v), k(rnd(lo.v) + ' %', 'lowest: class ' + lo.l, false, lo.v), k(rnd(hi.v - lo.v), 'points apart')];
    }
    else if (id === 'sections') out = A.sections.map(function (x) { return k(rnd(x.v) + ' %', x.l.toLowerCase(), false, x.v); });
    else if (id === 'cmds' && A.cmds.length > 1) out = [k(rnd(A.cmds[0].v) + ' %', 'hardest: ' + A.cmds[0].l, false, A.cmds[0].v), k(rnd(A.cmds[A.cmds.length - 1].v) + ' %', 'easiest: ' + A.cmds[A.cmds.length - 1].l, false, A.cmds[A.cmds.length - 1].v)];
    else if (id === 'mcq' && A.mcq.length) out = [k(rnd(A.mcq[0].v) + ' %', 'wrong: ' + A.mcq[0].l, false, 100 - A.mcq[0].v), k(A.mcqDen, A.mcqDen === 1 ? 'pupil\u2019s answers recorded' : 'pupils\u2019 answers recorded')];
    else if (id === 'errors' && A.errTotal) out = [k(rnd(A.errors[0].v) + ' %', A.errors[0].l), k(rnd(A.errors[1].v) + ' %', A.errors[1].l), k(A.errTotal, A.errTotal === 1 ? 'reason given' : 'reasons given')];
    else if (id === 'vocab' && A.vocab.length) out = [k(A.vocab[0].dk + A.vocab[0].pa, 'flagged “' + A.vocab[0].l + '”'), k(A.vocabSubs, A.vocabSubs === 1 ? 'reflection' : 'reflections')];
    else if (id === 'timing' && A.timingN) out = [k(rnd(A.timing[0].share) + ' %', 'revised all year')].concat(A.timing[0].m !== null ? [k(rnd(A.timing[0].m) + ' %', 'their mean score', false, A.timing[0].m)] : [])
      .concat(A.timing[2].m !== null ? [k(rnd(A.timing[2].m) + ' %', 'mean, revised only just before', false, A.timing[2].m)] : []);
    else if (id === 'bvg' && A.girls.nc && A.boys.nc) out = [k(rnd(A.girls.mean) + ' %', 'girls\u2019 mean', false, A.girls.mean), k(rnd(A.boys.mean) + ' %', 'boys\u2019 mean', false, A.boys.mean),
      k((A.girls.mean - A.boys.mean > 0 ? '+' : '') + rnd(A.girls.mean - A.boys.mean), 'points, girls \u2212 boys')];
    return out.filter(function (x) { return x.v.indexOf('\u2014') < 0; });
  }
  function kpiHtml(list) {
    return list.length ? '<div class="kpis">' + list.map(function (x) {
      return '<div class="kpi' + (x.warn ? ' kpi--warn' : '') + (x.band ? ' kpi--' + x.band.k : '') + '"><b>' + esc(x.v) + '</b><span>' + esc(x.l) + '</span>' +
        (x.band ? '<em class="kpi__band"><i></i>' + esc(x.band.l) + '</em>' : '') + '</div>'; }).join('') + '</div>' : '';
  }
  function topicLabelOf(k) { var n = String(S.D.topics[k] || '').trim(); return !n ? (k === 'AO3' ? 'AO3 Practical skills' : 'Topic ' + k) : n.indexOf(String(k)) === 0 ? n : k + ' ' + n; }

  /* question 13 */
  function balancePanel(W, showT) {
    S.bvHas = false;
    if (!Balance || !OUTLINE) return '<p class="empty">The balance rules did not load. Reload the page.</p>';
    var bt = balanceTests(), L = Balance.LIMITS, h = '';
    var mapsNote = 'The question maps reach the tracker from the reflection: 📤 Update the tracker, in a reflection spreadsheet with the newest build, writes them into its 🧩 Question maps tab.';
    if (!bt.tests.length) return '<p class="empty">No test is registered for this year group.</p>';
    var one = bt.tests.length === 1 ? bt.tests[0] : null;
    if (!one) {
      h += '<p class="answer">' + (bt.mapped ? 'Choose a test above to see its map. In short:' : 'No test of this year group has a question map yet.') + '</p>';
      if (!bt.mapped) h += '<p class="rule-note">' + esc(mapsNote) + '</p>';
      h += tableHtml('Table 1. Data showing how each test’s marks are spread (flags in amber).', ['Test', 'Version', 'On its own topics', 'Sub-topics with marks', 'Points covered', 'Heaviest sub-topic', 'AO3', 'Not yet taught', 'Versions match', ''],
        [].concat.apply([], bt.tests.map(function (t) {
          return t.ids.map(function (vid, i) {
            var b = t.bs[i], e = S.D.reg[vid] || {};
            var first = i === 0, vm = !first ? '' : t.ids.length < 2 ? 'one version' : !t.vc ? '—' : t.vc.flagged.length ? '<span class="nym">⚠ ' + t.vc.flagged.length + ' to look at</span>' : '✓';
            if (!b) return [first ? '<b>' + esc(t.name) + '</b>' : '', esc(e.ver || ''), '<span class="nym">no question map yet</span>', '', '', '', '', '', vm, ''];
            var hv = b.heaviest, hvPct = b.cat.own && hv ? hv.m / b.cat.own * 100 : 0;
            return [first ? '<b>' + esc(t.name) + '</b>' : '', esc(e.ver || ''), (b.ownPct < L.ownShare ? '<span class="nym">' : '') + rnd(b.ownPct) + ' %' + (b.ownPct < L.ownShare ? '</span>' : ''),
              b.subsHit + ' of ' + b.subs.length, b.nCov + ' of ' + b.nSt, hv ? esc(hv.n) + ', ' + rnd(hvPct) + ' %' + (hv.heavy ? ' <span class="nym">heavy</span>' : '') : '—',
              rnd(b.ao3Pct) + ' %', b.cat.late ? '<span class="nym">⚠ ' + marksTxt(b.cat.late) + '</span>' : '—', vm,
              first ? '<button class="btn" data-pick="' + esc(t.k) + '">Open</button>' : ''];
          });
        })), [0, 0, 1, 1, 1, 0, 1, 1, 0, 0]);
    } else {
      var have = one.bs.filter(Boolean);
      if (!have.length) {
        h += '<p class="answer">' + esc(one.name) + ' has no question map yet.</p><p class="rule-note">' + esc(mapsNote) + '</p>';
      } else {
        S.bvHas = true;
        var pick = one.ids.indexOf(S.bv) >= 0 && one.bs[one.ids.indexOf(S.bv)] ? S.bv : one.ids[one.bs.indexOf(have[0])];
        if (one.ids.length > 1) h += '<div class="seg" role="group" aria-label="Version" style="margin-top:4px">' + one.ids.map(function (vid, i) {
          var e = S.D.reg[vid] || {}; return '<button data-bv="' + esc(vid) + '" aria-pressed="' + (vid === pick) + '"' + (one.bs[i] ? '' : ' disabled') + '>Version ' + esc(e.ver || vid) + (one.bs[i] ? '' : '<small>no map yet</small>') + '</button>';
        }).join('') + '</div>';
        var b = one.bs[one.ids.indexOf(pick)];
        h += balancePanelHtml(b, one.vc, W, OUTLINE, { table: showT });
        if (one.ids.length > have.length) h += '<p class="partial">Not complete: ' + (one.ids.length - have.length) + ' version' + (one.ids.length - have.length > 1 ? 's have' : ' has') + ' no question map yet, so the versions table leaves ' + (one.ids.length - have.length > 1 ? 'them' : 'it') + ' out.</p>';
      }
    }
    h += how(['Each question’s points come from the registry’s map (structured questions: their bullets; multiple choice: mcqBullets; AO3: ao3QuestionIds and AO3 points). A question on two points shares its marks between them.',
      'Its own topics are the ones the test is for: a routine test’s are in its name (Test T7: topic 7); an annual exam’s are all the topics of its year that the paper names. Earlier topics are fine: what the class has already been taught.',
      'Taught already: the year of each point by the school’s order (the reflection’s getTopicYear; sub-topics 14.5 and 16.3 are Year 11), and, in the same year, topics up to the test’s highest one. No look-ahead.',
      'Heavy: more than ' + L.heavy + ' × an even share (the marks on its own topics ÷ its number of sub-topics). Aim: at least ' + L.ownShare + ' % of the marks on its own topics. These limits are fixed, in one rules file (js/balance.js) that the new-test skill uses too, so the website and test-making always agree.',
      'AO3 has no target: a topic with more practical work has more. What matters is that every version of a test has about the same marks in each row of the versions table (flag: more than ' + L.versionGap + ' marks apart).',
      'A keyword from a later topic is listed by the new-test skill’s tool, which reads the question wording. This page has no question wording, so it cannot list them.']);
    return h;
  }

  /* ---------- grade boundaries: one home, three doors (PLAN.md question 9) ---------- */
  function boundsEditor(fam, vers) {
    var D = S.D, live = !!S.preview, multi = vers.length > 1;
    var reports = vers.reduce(function (a, id) { return a + (+D.reports[id] || 0); }, 0);
    var savedLines = vers.map(function (id) {
      var h0 = D.bounds[id]; if (!h0) return '';
      var e = D.reg[id] || {};
      return (multi ? 'Version ' + esc(e.ver || id) + ': ' : '') + 'set ' + (h0.door ? 'on ' + esc(h0.door === 'website' ? 'the website' : h0.door) + ' ' : '') + 'by ' + esc(h0.by || 'someone') + (h0.at ? ' on ' + esc(dayTxt(Date.parse(h0.at)) || h0.at) : '') + '.';
    }).filter(Boolean);
    var ed = '<div class="bedit"><p class="eyebrow">Grade boundaries · ' + esc(fam.name) + '</p>' +
      '<p style="margin:6px 0 10px;color:var(--chalk-dim);font-size:13.5px">The lowest % for each grade' + (multi ? ', for each version' : '') + '. Below E is U. Try numbers: the chart follows at once, and nobody else sees them until you save. Saving changes this test only.</p>' +
      '<table><thead><tr><th>Grade</th>' + vers.map(function (v) { return '<th class="n">' + (multi ? 'Version ' + esc((D.reg[v] || {}).ver || v) : 'Min %') + '</th>'; }).join('') + '</tr></thead><tbody>' +
      BOUND_GRADES.map(function (g, gi) {
        return '<tr><td>' + g + '</td>' + vers.map(function (v, vi) {
          var val = boundsFor(D, v, S.preview).pcts[gi];
          return '<td class="n"><input type="number" inputmode="decimal" min="0" max="100" step="0.5" data-bver="' + esc(v) + '" data-bg="' + gi + '" value="' + esc(val) + '" aria-label="' + g + (multi ? ', version ' + esc((D.reg[v] || {}).ver || v) : '') + '"' + (multi && S.bSame && vi > 0 ? ' disabled' : '') + '></td>';
        }).join('') + '</tr>';
      }).join('') + '</tbody></table>' + (multi ? '<label class="same"><input type="checkbox" data-bsame' + (S.bSame ? ' checked' : '') + '> Same for every version</label>' : '') +
      (live ? '<p class="partial">Preview: the page already uses these numbers. Nothing is saved, and nobody else sees them, until you press Save.</p>' : '') +
      (S.canBounds ? '<div class="tools"><button class="btn btn--solid" data-bsave' + (S.saving ? ' disabled' : '') + '>' + (S.saving ? 'Saving…' : 'Save and update everywhere') + '</button>' + (live ? '<button class="btn" data-bundo>Undo my changes</button>' : '') + '</div>'
        : (live ? '<div class="tools"><button class="btn" data-bundo>Undo my changes</button></div>' : '') + '<p class="tcap">You can try numbers here. Saving is for the people ticked “may change grade boundaries” in the tracker’s 👥 window.</p>') +
      '<p class="bmsg' + (S.bMsg ? (S.bBad ? ' bad' : ' ok') : '') + '" id="bmsg" aria-live="polite">' + esc(S.bMsg || '') + '</p>' +
      (reports ? '<p class="tcap">' + reports + ' report' + (reports === 1 ? '' : 's') + ' already show grades from the boundaries at the time; ' + (reports === 1 ? 'it does' : 'they do') + ' not change.</p>' : '') +
      (savedLines.length ? '<p class="tcap">' + savedLines.join(' ') + '</p>' : '<p class="tcap">Not saved for this test yet: it uses ' + (vers.some(function (v) { return boundsFor(D, v).src === 'mirror'; }) ? 'the annual boundaries stored in the 📦 Registry' : 'the default IGCSE boundaries') + '.</p>') +
      '<p class="tcap">Saved boundaries are kept in the tracker\u2019s \ud83c\udfaf Grade boundaries tab. This page uses them at once. The assessment\u2019s own spreadsheet, its reports and My assessments use them once their next reflection update is pasted.</p></div>';
    return ed;
  }
  function readBounds() {
    var vals = {}, bad = '', inputs = main.querySelectorAll('[data-bver]');
    Array.prototype.forEach.call(inputs, function (inp) { var v = inp.getAttribute('data-bver'); (vals[v] = vals[v] || [])[+inp.getAttribute('data-bg')] = parseFloat(inp.value); });
    var vs = Object.keys(vals);
    if (S.bSame && vs.length > 1) vs.forEach(function (v) { vals[v] = vals[vs[0]].slice(); });
    vs.forEach(function (v) {
      var a = vals[v], ver = (S.D.reg[v] || {}).ver;
      for (var i = 0; i < a.length; i++) {
        if (isNaN(a[i]) || a[i] < 0 || a[i] > 100) bad = bad || 'Each value must be a number from 0 to 100.';
        else if (i && a[i] >= a[i - 1]) bad = bad || 'Each grade needs a lower % than the grade above it (' + BOUND_GRADES[i] + (vs.length > 1 && ver ? ', version ' + ver : '') + ').';
      }
    });
    return { vals: vals, bad: bad };
  }
  function saveBounds() {
    var rd = readBounds(), m = doc.getElementById('bmsg');
    if (rd.bad) { if (m) { m.textContent = rd.bad; m.className = 'bmsg bad'; } return; }
    var v = SI && SI.live();
    if (!v) { S.bMsg = 'Your sign-in ran out. Sign in again, then save.'; S.bBad = true; return draw(); }
    var ids = Object.keys(rd.vals), seen = {};
    ids.forEach(function (id) { seen[id] = S.D.bounds[id] ? String(S.D.bounds[id].at || '') : ''; });
    S.saving = true; S.bMsg = ''; draw();
    fetch(URL_, { method: 'POST', mode: 'cors', credentials: 'omit', cache: 'no-store', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                  body: JSON.stringify({ action: 'analysis.bounds', token: v.token, sets: ids.map(function (id) { return { id: id, p: rd.vals[id] }; }), seen: seen }) })
      .then(function (r) { if (!r.ok) throw new Error('http ' + r.status); return r.json(); })
      .then(function (j) {
        S.saving = false;
        if (!S.D) return;
        if (!j || !j.ok) {
          S.bBad = true;
          S.bMsg = !j ? 'The server did not answer. Nothing was saved.'
            : j.why === 'changed' ? 'Changed by ' + (j.by || 'someone') + (j.at ? ' at ' + when(Date.parse(j.at)) : '') + ' since you opened this page. Press Read again, then try once more.'
            : j.why === 'not allowed' ? 'Your account may look, but not save: ask for the “may change grade boundaries” tick in the tracker’s 👥 window.'
            : j.why === 'busy' ? 'Someone else is saving at this moment. Try again in a few seconds.'
            : j.why === 'not signed in' ? 'Your sign-in was not accepted. Sign in again, then save.'
            : 'Not saved: ' + (j.why || 'the server said no') + '.';
          return draw();
        }
        Object.keys(j.bounds || {}).forEach(function (id) { S.D.bounds[id] = j.bounds[id]; });
        S.preview = null; S.bBad = false;
        S.bMsg = (j.changed && j.changed.length ? 'Saved for ' + (ids.length > 1 ? (S.bSame ? 'every version' : 'versions ' + ids.map(function (id) { return (S.D.reg[id] || {}).ver || id; }).join(', ')) : 'this test') + '. The grades on this page changed at once.'
          : 'Nothing to save: these are the saved boundaries already.');
        draw();
      })
      .catch(function () { S.saving = false; S.bBad = true; S.bMsg = 'Could not reach the server. Nothing was saved.'; draw(); });
  }

  /* ---------- clicks, choices and typing ---------- */
  doc.addEventListener('click', function (e) {
    var openPop = doc.getElementById('qpop');
    if (openPop && !openPop.hidden && !(e.target.closest && e.target.closest('#qpop, #qpick'))) pickerOpen(false);   // a click outside closes it
    var t = e.target.closest && e.target.closest('button'); if (!t || t.disabled) return;
    if (t.id === 'qpick') { pickerOpen(doc.getElementById('qpop').hidden); return; }
    if (t.hasAttribute('data-qopt')) { S.q = t.getAttribute('data-qopt'); draw(); var b = doc.getElementById('qpick'); if (b) b.focus(); return; }
    if (t.hasAttribute('data-out')) { if (SI) SI.out(); else screenSignIn(); return; }
    if (t.hasAttribute('data-other')) { if (SI) SI.out(); return; }
    if (t.hasAttribute('data-again')) { ask(false); return; }
    if (!S.D) return;
    if (t.hasAttribute('data-fresh')) { ask(true); return; }
    if (t.hasAttribute('data-tab')) { S.tab = t.getAttribute('data-tab'); S.k = ''; S.c = ''; S.preview = null; S.bEdit = false; S.bMsg = ''; S.bv = ''; return draw(); }
    if (t.hasAttribute('data-qstep')) {
      var flat = []; QUESTIONS.forEach(function (g) { g.items.forEach(function (it) { flat.push(it.id); }); });
      S.q = flat[(flat.indexOf(S.q) + (+t.getAttribute('data-qstep')) + flat.length) % flat.length];
      return draw();
    }
    if (t.hasAttribute('data-q')) {
      S.q = t.getAttribute('data-q'); draw();
      if (root.matchMedia('(max-width:820px)').matches) { var q = main.querySelector('[data-q="' + S.q + '"]'); if (q && q.scrollIntoView) q.scrollIntoView({ block: 'start', behavior: 'smooth' }); }
      return;
    }
    if (t.hasAttribute('data-table')) { S.table[S.q] = !S.table[S.q]; return draw(); }
    if (t.hasAttribute('data-own')) { S.own = !S.own; return draw(); }
    if (t.hasAttribute('data-all')) { S.k = ''; S.preview = null; S.bEdit = false; return draw(); }
    if (t.hasAttribute('data-pick')) { S.k = t.getAttribute('data-pick'); S.preview = null; S.bEdit = false; S.bMsg = ''; S.bv = ''; return draw(); }
    if (t.hasAttribute('data-bv')) { S.bv = t.getAttribute('data-bv'); return draw(); }
    if (t.hasAttribute('data-bedit')) { S.bEdit = !S.bEdit; S.bMsg = ''; S.preview = null; return draw(); }
    if (t.hasAttribute('data-bundo')) { S.preview = null; S.bBad = false; S.bMsg = 'Undone: the saved boundaries are back.'; return draw(); }
    if (t.hasAttribute('data-bsave')) { saveBounds(); return; }
  });
  doc.addEventListener('change', function (e) {
    if (!S.D) return;
    var el = e.target;
    if (el.hasAttribute && el.hasAttribute('data-bsame')) { S.bSame = el.checked; S.bMsg = ''; if (S.bSame) { var rd = readBounds(); if (!rd.bad) S.preview = { vals: rd.vals }; } return draw(); }
    if (el.id === 'selA') { S.k = el.value; S.bEdit = false; S.bMsg = ''; S.preview = null; S.bv = ''; return draw(); }
    if (el.id === 'selC') { S.c = el.value; return draw(); }
  });
  /* the picker's keys: Escape closes it, the arrows move between questions */
  doc.addEventListener('keydown', function (e) {
    var pop = doc.getElementById('qpop'); if (!pop || pop.hidden) return;
    var opts = [].slice.call(pop.querySelectorAll('.qopt')), at = opts.indexOf(doc.activeElement);
    if (e.key === 'Escape') { e.preventDefault(); pickerOpen(false); doc.getElementById('qpick').focus(); }
    else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); var nx = opts[(at + (e.key === 'ArrowDown' ? 1 : -1) + opts.length) % opts.length]; if (nx) nx.focus(); }
    else if (e.key === 'Home' || e.key === 'End') { e.preventDefault(); opts[e.key === 'Home' ? 0 : opts.length - 1].focus(); }
  });
  /* typing a number previews it at once: every grade on the page re-grades; nothing is saved */
  doc.addEventListener('input', function (e) {
    var inp = e.target.closest && e.target.closest('[data-bver]'); if (!inp || !S.D) return;
    var rd = readBounds(), m = doc.getElementById('bmsg');
    if (rd.bad) { if (m) { m.textContent = 'Preview waits: ' + rd.bad; m.className = 'bmsg bad'; } return; }
    S.preview = { vals: rd.vals }; S.bMsg = '';
    var keep = { v: inp.getAttribute('data-bver'), g: inp.getAttribute('data-bg') }, y = root.scrollY;
    draw(); root.scrollTo(0, y);
    var again = main.querySelector('[data-bver="' + (root.CSS && CSS.escape ? CSS.escape(keep.v) : keep.v) + '"][data-bg="' + keep.g + '"]');
    if (again) again.focus();
  });

  /* one tooltip for every chart: hover with a mouse, tap on a phone */
  function showTip(e) {
    var hh = e.target.closest && e.target.closest('[data-tip]');
    if (!hh || !hh.getAttribute('data-tip')) { tip.hidden = true; return; }
    tip.innerHTML = hh.getAttribute('data-tip'); tip.hidden = false;
    var x = Math.min(e.clientX + 14, root.innerWidth - tip.offsetWidth - 8), y = e.clientY + 16;
    if (y + tip.offsetHeight > root.innerHeight - 8) y = e.clientY - tip.offsetHeight - 12;
    tip.style.left = Math.max(8, x) + 'px'; tip.style.top = y + 'px';
  }
  doc.addEventListener('mousemove', showTip);
  doc.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('[data-tip]')) showTip(e); });
  root.addEventListener('scroll', function () { tip.hidden = true; }, { passive: true });
  var lastW = root.innerWidth;
  root.addEventListener('resize', function () { if (Math.abs(root.innerWidth - lastW) > 40 && S.screen === 'analysis') { lastW = root.innerWidth; draw(); } });

  /* 20 minutes without use, a closed tab, or Back/Forward: the data goes */
  ['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach(function (ev) { doc.addEventListener(ev, function () { S.lastUse = Date.now(); }, { passive: true, capture: true }); });
  function checkIdle() { if (S.D && Date.now() - S.lastUse > IDLE_MS) screenHidden(); }
  root.setInterval(checkIdle, 15000);
  doc.addEventListener('visibilitychange', checkIdle);
  root.addEventListener('pagehide', function () { wipe(); S.screen = ''; main.innerHTML = ''; });
  root.addEventListener('pageshow', function (e) { if (e.persisted) { if (SI && SI.who()) screenHidden(); else screenSignIn(); } });

  /* the one sign-in: here, renewed in the background, or in another tab of the site */
  if (SI) SI.on(function (v) {
    if (!v) { return screenSignIn(); }
    if (!SI.fresh(v)) return;
    if (S.D && S.me === v.email) return;          /* the same person, renewed */
    if (S.screen === 'hidden') { setAcct(); return; }
    wipe(); ask(false);
  });

  /* start */
  if (!URL_) screenRefused('no address');
  else if (!root.DecompressionStream) screenRefused('old browser');
  else if (!SI) screenRefused('network');
  else if (SI.who()) ask(false);
  else screenSignIn();
})(typeof window !== 'undefined' ? window : globalThis);
