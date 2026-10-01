/* ============================================================
   balance.js — THE rules for a balanced test.

   Daniel, 1 Oct 2026 (memory test-balance-rules): a test is mostly its own topic(s), spread over
   their sub-topics; the multiple choice covers what the structured questions cannot; AO3 counts;
   questions come only from what the class has been taught; every version of one test carries
   about the same marks in each part.

   ONE file, read by two things, so they can never disagree:
     · the private analysis page (question 13 "Is each test balanced, and do its
       versions match?"), in the browser;
     · tools/test-balance.mjs, which the new-test skill (step 1b) runs on a draft or a registry
       entry, in node.
   The limits below are FIXED (Daniel, 1 Oct 2026, question 10). Change them here and only here.

   A test's MAP (what both readers hand to balance()):
     { v:1, id, name, type:'annual'|'routine', fam, ver, ay:'2026/27', yg:10, total,
       topics:['T3','T7',…]  the registry's cambridgeTopics keys (no AO3),
       own:[…]               optional: the test's own topics, when they cannot be read from its name,
       q:[[id, 'm'|'s', marks, ['7.4.2',…], ao3 0|1], …] }
   one row per question: multiple choice ('m', id A1…) or structured ('s', its sqId), its marks, its
   syllabus points (registry questionMap[].bullets, mcqBullets) and whether it is an AO3 question
   (ao3QuestionIds). No question wording: the analysis page never needs it.
   ============================================================ */
(function (root) {
  'use strict';

  /* The limits (fixed; see above):
       ownShare    at least this % of a test's marks on its own topics
       heavy       a sub-topic is "heavy" above this many times an even share
                   (an even share = the marks on its own topics ÷ their number of sub-topics)
       versionGap  two versions more than this many marks apart in any row get a flag */
  var LIMITS = { ownShare: 70, heavy: 2, versionGap: 2 };

  /* For reference only, never a target (Daniel, 1 Oct 2026: a topic with more practical work has more):
     AO3 is 20 % of the whole 0610 qualification, all in Papers 5 and 6 (syllabus 2026–28, p. 11). */
  var AO3_QUALIFICATION = 20;

  function topicNum(ref) { var m = /^(\d+)/.exec(String(ref)); return m ? +m[1] : NaN; }
  function isAo3(ref) { return /^AO3/i.test(String(ref)); }

  /* The year a point is taught in the school's order: the reflection's getTopicYear (Code/Code.gs), the year
     only. It works by point, not by topic: 6, 8 and 17–21 are Year 11, and so are sub-topics 14.5 and 16.3.
     The harness compares the two on every point of the syllabus (check_analysis_sums.mjs). */
  function taughtYear(ref) {
    var s = String(ref), t = topicNum(s);
    if (isNaN(t)) return 99;
    if (t >= 1 && t <= 5) return 9;
    if (t === 6 || t === 8) return 11;
    if (t === 14 && s.indexOf('14.5') === 0) return 11;
    if (t === 16 && s.indexOf('16.3') === 0) return 11;
    if (t >= 7 && t <= 16) return 10;
    if (t >= 17 && t <= 21) return 11;
    return 99;
  }

  /* One syllabus version from labs-shared/syllabus.json → its outline: titles, numbers, Core or Supplement,
     never a point's wording. {v, t:{'7':{title, s:[['7.1','Diet',[['1','C'],…]],…]}}} */
  function outlineFrom(version) {
    var out = { v: String(version.version || ''), t: {} };
    (version.topics || []).forEach(function (tp) {
      out.t[String(tp.n)] = {
        title: String(tp.title || ''),
        s: (tp.sections || []).map(function (sec) {
          var pts = (sec.core || []).map(function (p) { return [String(p.n), 'C']; })
            .concat((sec.supplement || []).map(function (p) { return [String(p.n), 'S']; }))
            .sort(function (a, b) { return (+a[0]) - (+b[0]); });
          return [String(sec.n), String(sec.title || ''), pts];
        })
      };
    });
    return out;
  }

  function ygNum(v) { var m = /(\d+)/.exec(String(v == null ? '' : v)); return m ? +m[1] : 0; }

  /* A registry entry (Code/2_Registry.gs, ASSESSMENT_REGISTRY[id]) → its map. The reflection's
     📤 Update the tracker writes the same shape into the tracker's 🧩 Question maps tab. */
  function fromRegistry(id, e) {
    e = e || {};
    var q = [], mb = e.mcqBullets || {}, n = +e.mcqCount || 0;
    for (var i = 1; i <= n; i++) {
      var x = mb[i] || mb[String(i)];
      q.push(['A' + i, 'm', 1, x && x.bullet ? [String(x.bullet)] : [], 0]);
    }
    var ids = e.sqIds || [], mx = e.sqMax || [], qm = e.questionMap || {}, ao3 = e.ao3QuestionIds || [];
    ids.forEach(function (sid, k) {
      var m = qm[sid] || {};
      q.push([String(sid), 's', +mx[k] || 0, (m.bullets || []).map(String), ao3.indexOf(sid) >= 0 ? 1 : 0]);
    });
    return {
      v: 1, id: String(id), name: String(e.name || id), type: String(e.assessmentType || ''),
      fam: String(e.assessmentFamily || id), ver: String(e.version || ''), ay: String(e.academicYear || ''),
      yg: ygNum((e.branding || {}).yearGroup), total: +e.totalMarks || 0,
      topics: (e.cambridgeTopics || []).map(function (t) { return String(t.key); }).filter(function (k) { return /^T\d+$/.test(k); }),
      q: q
    };
  }

  /* A test's own topics:
       · given in the map (`own`), when its name does not say;
       · an annual exam: every topic of its year that the paper names (Daniel: "the main topics are all the
         topics of the year"; earlier years' topics may sit in the multiple choice);
       · a routine test: the topics its name gives ("Test T11T12" → T11, T12);
       · otherwise the paper's topics taught in its year. */
  function ownTopics(m) {
    if (m.own && m.own.length) return m.own.map(String);
    var yearTopics = (m.topics || []).filter(function (k) { return taughtYear(k.slice(1) + '.1.1') === m.yg; });
    if (m.type === 'annual') return yearTopics;
    var seen = {}, named = [];
    String(m.fam || m.id || '').replace(/T(\d{1,2})/g, function (_, d) { if (!seen[d]) { seen[d] = 1; named.push('T' + d); } return _; });
    return named.length ? named : yearTopics;
  }

  /* Where a test's marks are. Each question's marks are shared equally between its points. A point counts as
       · its own topics, when it is in one of the test's own sub-topics;
       · AO3, when it is an AO3.* point (or the question is an AO3 question with no other point);
       · earlier topics, when the class has been taught it: its year is before the test's, or it is in the
         same year and its topic is no higher than the test's highest own topic (no look-ahead);
       · not yet taught, otherwise;
       · not mapped, when the map gives the question no point the outline knows. */
  function balance(m, outline) {
    var own = ownTopics(m), yg = +m.yg || 0, ownNums = own.map(function (k) { return +k.slice(1); });
    var maxOwn = ownNums.length ? Math.max.apply(null, ownNums) : 0;
    var subs = [], byN = {}, secs = {};
    Object.keys((outline && outline.t) || {}).forEach(function (tn) {
      outline.t[tn].s.forEach(function (x) { secs[x[0]] = x; });
    });
    own.forEach(function (k) {
      var tp = outline && outline.t[k.slice(1)];
      if (!tp) return;
      tp.s.forEach(function (x) {
        if (taughtYear(x[0]) > yg) return;   // a sub-topic taught later (14.5, 16.3 before Year 11) is not one of its own yet
        var r = { topic: k, n: x[0], l: x[1], sts: x[2], mcq: 0, wr: 0, cov: {} };
        subs.push(r); byN[x[0]] = r;
      });
    });
    var cat = { own: 0, earlier: 0, ao3: 0, late: 0, unmapped: 0 }, lateQs = [], unmapped = [], mcq = 0, sq = 0;
    function add(ref, marks, kind, qid) {
      if (isAo3(ref)) { cat.ao3 += marks; return; }
      var parts = String(ref).split('.'), t = topicNum(ref), sec = parts.slice(0, 2).join('.');
      if (isNaN(t) || parts.length < 2 || !secs[sec]) { cat.unmapped += marks; if (unmapped.indexOf(qid) < 0) unmapped.push(qid); return; }
      var r = byN[sec];
      if (r) {
        cat.own += marks; r[kind] += marks;
        if (parts.length >= 3) { var p = parts.slice(0, 3).join('.'); r.cov[p] = (r.cov[p] || '') + (r.cov[p] && r.cov[p].indexOf(kind) >= 0 ? '' : kind); }
        return;
      }
      var yr = taughtYear(ref);
      if (yr < yg || (yr === yg && t <= maxOwn)) cat.earlier += marks;
      else { cat.late += marks; lateQs.push({ q: qid, ref: String(ref), yr: yr }); }
    }
    (m.q || []).forEach(function (q) {
      var id = String(q[0]), kind = q[1] === 'm' ? 'mcq' : 'wr', marks = +q[2] || 0, refs = (q[3] || []).filter(Boolean), ao3 = !!q[4];
      if (kind === 'mcq') mcq += marks; else sq += marks;
      if (!refs.length) {
        if (ao3) cat.ao3 += marks;
        else { cat.unmapped += marks; if (unmapped.indexOf(id) < 0) unmapped.push(id); }
        return;
      }
      refs.forEach(function (r) { add(r, marks / refs.length, kind, id); });
    });
    var total = mcq + sq, even = subs.length ? cat.own / subs.length : 0;
    var nSt = 0, nCov = 0, core = [0, 0], supp = [0, 0];
    subs.forEach(function (r) {
      r.m = r.mcq + r.wr;
      r.heavy = even > 0 && r.m > LIMITS.heavy * even;
      r.miss = r.m === 0;
      r.covN = Object.keys(r.cov).length;
      nSt += r.sts.length; nCov += r.covN;
      r.sts.forEach(function (st) {
        var hit = !!r.cov[r.n + '.' + st[0]], c = st[1] === 'S' ? supp : core;
        c[1]++; if (hit) c[0]++;
      });
    });
    var heaviest = subs.slice().sort(function (x, y) { return y.m - x.m; })[0] || null;
    return {
      id: m.id, name: m.name, ver: m.ver, fam: m.fam, ay: m.ay, yg: yg, type: m.type, own: own,
      subs: subs, cat: cat, total: total, stated: +m.total || 0, mcq: mcq, sq: sq, even: even,
      nSt: nSt, nCov: nCov, core: core, supp: supp, lateQs: lateQs, unmapped: unmapped, heaviest: heaviest,
      ownPct: total ? cat.own / total * 100 : 0, ao3Pct: total ? cat.ao3 / total * 100 : 0,
      subsHit: subs.filter(function (r) { return r.m > 0; }).length
    };
  }

  function r0(x) { return Math.round(x); }
  function r1(x) { return Math.round(x * 10) / 10; }
  function marksWord(x) { var v = r1(x); return v + (v === 1 ? ' mark' : ' marks'); }

  /* What a person should look at, in plain sentences. The same list on the page and in the tool. */
  function flagsOf(b) {
    var f = [];
    if (b.total && b.ownPct < LIMITS.ownShare)
      f.push('only ' + r0(b.ownPct) + ' % of the marks are on its own topics (aim: at least ' + LIMITS.ownShare + ' %)');
    b.subs.filter(function (r) { return r.heavy; }).forEach(function (r) {
      f.push(r.n + ' ' + r.l + ' carries ' + r0(r.m / b.cat.own * 100) + ' % of its own topics’ marks (an even share is ' + r0(b.even / b.cat.own * 100) + ' %)');
    });
    var miss = b.subs.filter(function (r) { return r.miss; });
    if (miss.length) f.push(miss.length + ' sub-topic' + (miss.length > 1 ? 's have' : ' has') + ' no marks: ' + miss.map(function (r) { return r.n; }).join(', '));
    b.lateQs.forEach(function (x) {
      f.push('question ' + x.q + ' is on ' + x.ref + ', taught in ' + (x.yr === 99 ? 'no year of the school’s order' : 'Year ' + x.yr + (x.yr === b.yg ? ', later this year' : '')) + ': not yet taught');
    });
    if (b.unmapped.length) f.push('no syllabus point in the map for question' + (b.unmapped.length > 1 ? 's ' : ' ') + b.unmapped.join(', '));
    if (b.stated && Math.abs(b.stated - b.total) > 1e-9) f.push('its questions add up to ' + marksWord(b.total) + ', but the paper says ' + marksWord(b.stated));
    return f;
  }

  /* Do the versions of one test match? (Daniel, 1 Oct 2026: "all versions have to be balanced in terms of how
     many marks for each".) One row per part; a row whose versions are more than LIMITS.versionGap marks apart
     is flagged. AO3 has no target of its own: it must simply be about the same in every version. */
  var VERSION_ROWS = [
    ['Its own topics', function (b) { return b.cat.own; }],
    ['Earlier topics', function (b) { return b.cat.earlier; }],
    ['AO3 practical skills', function (b) { return b.cat.ao3; }],
    ['Not yet taught', function (b) { return b.cat.late; }],
    ['Multiple choice', function (b) { return b.mcq; }],
    ['Structured', function (b) { return b.sq; }]
  ];
  function versions(bs) {
    if (!bs || bs.length < 2) return null;
    var rows = VERSION_ROWS.map(function (row) {
      var vals = bs.map(row[1]), gap = Math.max.apply(null, vals) - Math.min.apply(null, vals);
      return { l: row[0], vals: vals.map(r1), gap: r1(gap), flag: gap > LIMITS.versionGap + 1e-9 };
    });
    return { versions: bs.map(function (b) { return b.ver || b.id; }), rows: rows, flagged: rows.filter(function (r) { return r.flag; }) };
  }

  /* The versions of one test: the maps with the same family in the same school year, in version order. */
  function families(maps) {
    var by = {}, order = [];
    (maps || []).forEach(function (m) {
      var k = (m.fam || m.id) + '|' + (m.ay || '');
      if (!by[k]) { by[k] = []; order.push(k); }
      by[k].push(m);
    });
    return order.map(function (k) {
      return by[k].sort(function (a, b) { return String(a.ver).localeCompare(String(b.ver)) || String(a.id).localeCompare(String(b.id)); });
    });
  }

  var api = {
    LIMITS: LIMITS, AO3_QUALIFICATION: AO3_QUALIFICATION, VERSION_ROWS: VERSION_ROWS.map(function (r) { return r[0]; }),
    taughtYear: taughtYear, topicNum: topicNum, isAo3: isAo3, outlineFrom: outlineFrom, fromRegistry: fromRegistry,
    ownTopics: ownTopics, balance: balance, flagsOf: flagsOf, versions: versions, families: families
  };
  root.Balance = api;
  if (typeof module === 'object' && module && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
