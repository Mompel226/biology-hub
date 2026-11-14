/* ============================================================
   model.js — the shell of a private model page (model.html, 14 Nov 2026).
   Daniel: a pupil gets the link, has 24 hours from their first visit "to explore everything, take notes", and then
   cannot come back; and copying must be "very hard … unless it's basically them writing by hand".

   The page holds nothing. After the site's one sign-in (js/signin.js) it asks the labs script (action model.open;
   apps-script/Code.gs, 🔐 MODEL PAGES), which checks the account against the page's Who list and the pupil's hours, and
   only then sends the page: a gzip of its title, style, body and script, made by the model's _build/gate.py and kept
   in the teacher's own Drive. It is unpacked here, its body put in #mpg-page, its style in the head, and its script
   run from a blob. Nothing is stored: a reload asks the server again. A pupil's hours start only when they press
   Start, never because they were already signed in.

   What it blocks, as far as a web page can:
     - selecting text, dragging, the right-click menu, copy, cut, paste and drop (the events and the keys);
     - the keys for print, save, view source and the developer tools;
     - printing: the cover, and a blank sheet (css/model.css);
     - Shift and Command (⌘) held together (on a Mac the start of every screen shortcut: the page never sees the digit,
       memory mac-screenshot-keys), the Windows key with Shift, and Print Screen: the cover goes up at once;
     - the window not in use (it lost focus, or the tab is hidden): the cover, until the pupil comes back.
   What no web page can stop: a phone's camera, the browser's own menus (developer tools, Save Page, Reader), and a
   screen-capture app that needs no key the page sees. The faint watermark with the pupil's name is for those.
   Pupils read nothing about the keys or the blocks (Daniel, 14 Nov 2026: "don't even mention it … let's just not even
   incite the use of it"; memory mac-screenshot-keys): the rules give the hours and "take notes by hand", the cover says
   only "The page is hidden. Click here to continue reading." A pupil who tries finds that it does not work. What was
   blocked is counted and sent now and then (model.flag) to the teacher's 🔐 Model page visits tab.
   ============================================================ */
(function (root) {
  'use strict';
  var doc = root.document, CFG = root.HUB_LOCAL || {}, SI = root.SignIn || null;
  var URL_ = /^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(String(CFG.submitUrl || '')) ? String(CFG.submitUrl) : '';
  var CID = String(CFG.googleClientId || '');
  var PAGE = ((/[?&]p=([a-z0-9-]{1,40})(?:&|$)/.exec(String(root.location.search)) || [])[1]) || 'eco-mini-ia';
  var TITLES = { 'eco-mini-ia': 'Ecology mini IA: the model' };
  var TITLE = TITLES[PAGE] || 'Biology model page';
  var LOOK = { type: 'standard', theme: 'filled_blue', size: 'large', text: 'signin_with', shape: 'pill', logo_alignment: 'left', width: 240, locale: 'en-GB' };
  var gate = doc.getElementById('mpg-gate'), page = doc.getElementById('mpg-page'), bar = doc.getElementById('mpg-bar'),
      mark = doc.getElementById('mpg-mark'), cover = doc.getElementById('mpg-veil'),
      coverT = doc.getElementById('mpg-veil-t'), coverS = doc.getElementById('mpg-veil-s');
  var S = { busy: false, renewing: false, open: false, teacher: false, ends: 0, first: 0, hours: 24, skew: 0, me: '', name: '', tick: 0,
            hide: { keys: false, away: false, print: false, flash: false }, chord: null, flags: {}, flagTimer: 0 };

  /* ---------- words ---------- */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }
  var DAYS = 'Sun Mon Tue Wed Thu Fri Sat'.split(' '), MONTHS = 'Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec'.split(' ');
  function when(ms) {
    var d = new Date(ms); if (!ms || isNaN(d.getTime())) return '';
    return DAYS[d.getDay()] + ' ' + d.getDate() + ' ' + MONTHS[d.getMonth()] + ', ' + ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
  }
  function span(ms) {
    var m = Math.floor(ms / 60000), h = Math.floor(m / 60);
    return h ? h + ' h ' + (m % 60) + ' min' : (m < 1 ? 'less than a minute' : m + ' min');
  }
  function hoursWord(h) { return h === 1 ? '1 hour' : h + ' hours'; }
  function now() { return Date.now() + S.skew; }

  /* ---------- the screens before the page ---------- */
  function head(eyebrow) {
    return '<p class="mpg-eyebrow">' + eyebrow + '</p><h1>' + esc(TITLE) + '</h1><p class="mpg-by">Made by Dr Daniel Mompel Riera</p>';
  }
  function card(html) { gate.innerHTML = '<section class="mpg-card">' + html + '</section>'; gate.hidden = false; }
  function rules(h) {
    return '<h2>How this page works</h2><ol>' +
      '<li>You can read this page for <span class="mpg-key">' + hoursWord(h) + '</span>, counted from when you press Start. After that it closes for you, and it does not open again.</li>' +
      '<li>Open it when you have time to study it. You can close it and come back as often as you like within your ' + hoursWord(h) + '.</li>' +
      '<li>Take notes <span class="mpg-key">by hand</span>, in your own words.</li></ol>';
  }
  function screenSignIn(why) {
    card(head('Private page') + (why ? '<p class="mpg-note">' + esc(why) + '</p>' : '') +
      '<p>Sign in with your school Google account. Signing in does not start anything: you choose when to start.</p>' +
      '<div class="mpg-row"><div id="mpg-gsi"></div></div>' +
      '<p class="mpg-muted">This page holds nothing itself. After you sign in, the school’s server checks your account and sends the page only to the pupils on its list.</p>');
    mountButton();
  }
  function mountButton() {
    var el = doc.getElementById('mpg-gsi'); if (!el || !SI) return;
    if (SI.button(el, CID, LOOK)) return;
    el.innerHTML = '<span class="mpg-muted">Loading sign-in…</span>';
    SI.loaded(function (ok) {
      var e2 = doc.getElementById('mpg-gsi'); if (!e2) return;
      e2.innerHTML = '';
      if (ok && SI.button(e2, CID, LOOK)) return;
      e2.innerHTML = '<span class="mpg-muted">Google’s sign-in could not load here. Reload the page, or try another network.</span>';
    }, 10000);
  }
  function screenLoading(msg) {
    card(head('Private page') + '<p>' + esc(msg || 'Checking your account…') + '</p><div class="mpg-bar-load"><i></i></div>');
  }
  function screenStart(j) {
    var h = +j.hours || 24, end = (+j.now || now()) + h * 3600e3;
    if (+j.closes && +j.closes < end) end = +j.closes;
    S.hours = h;
    card(head('Private page') + '<p>You are signed in as <b>' + esc(j.email || '') + '</b>.</p>' +
      '<p class="mpg-note"><b>Your ' + hoursWord(h) + ' start when you press Start.</b> If you start now, the page closes for you on <b>' + esc(when(end)) + '</b>.</p>' +
      rules(h) +
      '<div class="mpg-row"><button class="mpg-btn mpg-btn--solid" type="button" data-start>Start my ' + hoursWord(h) + '</button>' +
      '<button class="mpg-btn" type="button" data-out>Use another account</button></div>');
  }
  function screenNotList(j) {
    card(head('Private page') + '<p>This account cannot open this page. You signed in as <b>' + esc(j.email || '') + '</b>.</p>' +
      '<p>Use your school Google account. If this is your school account, ask your teacher.</p>' +
      '<div class="mpg-row"><button class="mpg-btn mpg-btn--solid" type="button" data-out>Use another account</button></div>');
  }
  function screenOver(first, ends) {
    card(head('Closed for you') + '<p><b>Your time with this page is over.</b></p>' +
      (first ? '<p>You started on ' + esc(when(first)) + '. Your time ended on ' + esc(when(ends)) + '.</p>' : '') +
      '<p>Use the notes you took. If you need more time, ask your teacher.</p>');
  }
  function screenClosed(j) {
    card(head('Closed') + '<p><b>This page is closed.</b>' + (+j.closes || +j.ends ? ' It closed on ' + esc(when(+j.closes || +j.ends)) + '.' : '') + '</p>' +
      '<p>If you think this is wrong, ask your teacher.</p>');
  }
  function screenNotSetUp(j) {
    if (j.teacher) {
      card(head('Teacher view') + '<p><b>Not set up yet</b> (' + esc(j.why) + ').</p>' +
        '<p>In the Student data spreadsheet, tab <b>🔐 Model pages</b>, row <b>' + esc(PAGE) + '</b>: paste the Drive link of the page’s file (made by <code>_build/gate.py</code>), and type who may open it.</p>' +
        '<div class="mpg-row"><button class="mpg-btn mpg-btn--solid" type="button" data-again>Try again</button></div>');
    } else card(head('Private page') + '<p><b>This page is not open yet.</b> Ask your teacher.</p>');
  }
  function screenError(msg) {
    card(head('Private page') + '<p>' + esc(msg || 'The page could not load. Check your internet connection, then press Try again.') + '</p>' +
      '<div class="mpg-row"><button class="mpg-btn mpg-btn--solid" type="button" data-again>Try again</button></div>');
  }
  function screenOld() {
    card(head('Private page') + '<p>This browser is too old for this page. Open the link in the newest Chrome, Edge, Safari or Firefox.</p>');
  }

  /* ---------- asking the server ---------- */
  function post(body, keep) {
    return fetch(URL_, { method: 'POST', mode: 'cors', credentials: 'omit', cache: 'no-store', keepalive: !!keep,
                         headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body) })
      .then(function (r) { if (!r.ok) throw new Error('http ' + r.status); return r.json(); });
  }
  function unpack(b64) {
    var bin = atob(String(b64 || '')), bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    var stream = new Blob([bytes]).stream().pipeThrough(new root.DecompressionStream('gzip'));
    return new Response(stream).text().then(function (t) { return JSON.parse(t); });
  }
  function ask(start) {
    if (!URL_) return screenError('This page is not set up on this website.');
    if (!root.DecompressionStream || !root.Blob || !Blob.prototype.stream || !root.URL || !URL.createObjectURL) return screenOld();
    var v = SI && SI.live();
    if (!v) {
      if (SI && SI.who()) {
        screenLoading('Renewing your sign-in…');
        S.renewing = true;                            /* the renewal answers here, with what was asked (Start included) */
        SI.renew(CID, function (nv) { S.renewing = false; if (nv) ask(start); else screenSignIn('Your sign-in ran out after an hour. Sign in again.'); });
        return;
      }
      return screenSignIn();
    }
    if (S.busy) return;
    S.busy = true;
    screenLoading(start ? 'Opening the page…' : 'Checking your account…');
    var me = v.email;
    post({ action: 'model.open', token: v.token, page: PAGE, start: start === true })
      .then(function (j) {
        S.busy = false;
        var w = SI.who(); if (!w || w.email !== me) return;          /* signed out, or somebody else, meanwhile */
        if (!j) return screenError();
        if (j.ok) return openPage(j);
        var why = String(j.why || '');
        if (why === 'not signed in') return screenSignIn('The server did not accept the sign-in. Sign in again.');
        if (why === 'not started') return screenStart(j);
        if (why === 'not on the list') return screenNotList(j);
        if (why === 'time is up') return screenOver(+j.first, +j.ends);
        if (why === 'closed') return screenClosed(j);
        if (/^not set up/.test(why)) return screenNotSetUp(j);
        if (why === 'busy') return screenError('The server is busy. Wait a few seconds, then press Try again.');
        return screenError();
      })
      .catch(function () { S.busy = false; screenError(); });
  }

  /* ---------- the page ---------- */
  function openPage(j) {
    unpack(j.data).then(function (P) {
      if (!P || P.page !== PAGE || typeof P.body !== 'string' || typeof P.js !== 'string') throw new Error('not this page');
      S.open = true; S.teacher = !!j.teacher; S.ends = +j.ends || 0; S.first = +j.first || 0; S.hours = +j.hours || S.hours;
      S.skew = (+j.now || Date.now()) - Date.now(); S.me = String(j.email || ''); S.name = String(j.name || '');
      gate.hidden = true; gate.innerHTML = '';
      doc.body.classList.remove('mpg-locked'); doc.body.classList.add('mpg-open');
      var st = doc.createElement('style'); st.id = 'mpg-css'; st.textContent = String(P.css || ''); doc.head.appendChild(st);
      page.innerHTML = P.body; page.hidden = false;
      doc.title = String(P.title || TITLE);
      var url = URL.createObjectURL(new Blob([P.js], { type: 'text/javascript' }));
      var sc = doc.createElement('script'); sc.id = 'mpg-js'; sc.src = url;
      sc.onload = sc.onerror = function () { URL.revokeObjectURL(url); };
      doc.body.appendChild(sc);
      watermark(); clock();
      S.hide.away = !doc.hasFocus() || doc.hidden; showCover();
    }).catch(function () { screenError('The page arrived damaged. Press Try again.'); });
  }
  function wipe() {
    S.open = false; clearInterval(S.tick); S.tick = 0;
    page.innerHTML = ''; page.hidden = true;
    ['mpg-css', 'mpg-js'].forEach(function (id) { var el = doc.getElementById(id); if (el && el.parentNode) el.parentNode.removeChild(el); });
    bar.hidden = true; bar.innerHTML = ''; mark.hidden = true; mark.style.backgroundImage = '';
    doc.body.classList.add('mpg-locked'); doc.body.classList.remove('mpg-open');
    doc.title = 'Biology model page';
    S.hide.keys = S.hide.away = S.hide.print = S.hide.flash = false; showCover();
  }
  function timeUp() { var f = S.first, e = S.ends; sendFlags(false); wipe(); screenOver(f, e); }

  /* the pupil's name, faintly, over the whole page */
  function watermark() {
    var who = S.teacher ? 'Teacher view · ' + S.me : (S.name && S.name !== S.me ? S.name + ' · ' : '') + S.me;
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="520" height="260"><g transform="rotate(-24 260 130)" fill="#0F172A" fill-opacity="0.08" ' +
      'font-family="Arial, Helvetica, sans-serif" text-anchor="middle"><text x="260" y="124" font-size="16">' + esc(who) + '</text>' +
      '<text x="260" y="146" font-size="12">' + esc('Opened ' + when(now())) + '</text></g></svg>';
    mark.style.backgroundImage = 'url("data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg) + '")';
    mark.hidden = false;
  }
  /* how long the page stays open for this pupil */
  function clock() {
    clearInterval(S.tick);
    drawClock(); S.tick = setInterval(drawClock, 15000);
  }
  function drawClock() {
    if (!S.open) return;
    if (S.teacher) {
      bar.className = 'mpg-bar';
      bar.innerHTML = '<span><b>Teacher view:</b> no time limit for you. A pupil has ' + esc(hoursWord(S.hours)) + ' from when they press Start.</span><span class="mpg-bar__hint">Copying is blocked for you too, as for the pupils.</span>';
      bar.hidden = false; return;
    }
    var left = S.ends - now();
    if (left <= 0) return timeUp();
    if (left < 16000) setTimeout(drawClock, left + 50);      /* the last tick lands on the end itself */
    bar.className = 'mpg-bar' + (left < 3600e3 ? ' mpg-bar--soon' : '');
    bar.innerHTML = '<span>Open until <b>' + esc(when(S.ends)) + '</b> · <b>' + esc(span(left)) + '</b> left</span><span class="mpg-bar__hint">Take notes by hand.</span>';
    bar.hidden = false;
  }

  /* ---------- the cover ---------- */
  function showCover() {
    var h = S.hide, on = S.open && (h.keys || h.away || h.print || h.flash);
    if (on) {
      if (h.print) { coverT.textContent = 'This page cannot be printed.'; coverS.textContent = 'Take notes by hand.'; }
      else { coverT.textContent = 'The page is hidden.'; coverS.textContent = 'Click here to continue reading.'; }
    }
    cover.hidden = !on;
  }

  /* ---------- what is blocked, and counted for the teacher ---------- */
  function note(k) {
    if (!S.open || S.teacher) return;
    S.flags[k] = (S.flags[k] || 0) + 1;
    if (!S.flagTimer) S.flagTimer = setTimeout(function () { S.flagTimer = 0; sendFlags(false); }, 20000);
  }
  function sendFlags(leaving) {
    var n = S.flags;
    if (!Object.keys(n).length || S.teacher || !URL_) return;
    var v = SI && SI.live(); if (!v) return;          /* kept for later: never a reason to ask for a sign-in */
    S.flags = {};
    post({ action: 'model.flag', token: v.token, page: PAGE, n: n }, leaving).catch(function () {
      Object.keys(n).forEach(function (k) { S.flags[k] = (S.flags[k] || 0) + n[k]; });
    });
  }
  function isField(t) { return !!(t && t.tagName && /^(TEXTAREA|INPUT)$/.test(t.tagName)); }
  function block(e, k) { if (!S.open) return; e.preventDefault(); e.stopPropagation(); if (k) note(k); }

  /* Shift and Command (or the Windows key) held together: the cover at once. Counted once per press, as the reflection
     form counts it (§40.115): held ≥ 80 ms and let go with no other key between (⌘⇧Z and the like are not counted). */
  function chordOn(e) {
    var meta = e.metaKey || e.key === 'Meta' || e.key === 'OS', shift = e.shiftKey || e.key === 'Shift';
    if (meta && shift) {
      if (!S.chord) S.chord = { at: Date.now(), other: false };
      if (!S.hide.keys) { S.hide.keys = true; showCover(); }
    }
    if (S.chord && !/^(Meta|OS|Shift|Control|Alt)$/.test(String(e.key || ''))) S.chord.other = true;
  }
  function chordOff(e) {
    if (!S.hide.keys || (e.metaKey && e.shiftKey)) return;
    var c = S.chord; S.chord = null; S.hide.keys = false; showCover();
    if (c && !c.other && Date.now() - c.at >= 80) note('screen-keys');
  }
  function onKeyDown(e) {
    chordOn(e);
    if (!S.open) return;
    var c = String(e.code || ''), k = String(e.key || ''), mod = e.metaKey || e.ctrlKey, hit = '';
    if (k === 'F12' || c === 'F12') hit = 'dev-tools';
    else if (mod && e.altKey && /^Key[IJCU]$/.test(c)) hit = 'dev-tools';
    else if (mod && e.shiftKey && /^Key[IJCK]$/.test(c)) hit = 'dev-tools';
    else if (mod && c === 'KeyU') hit = 'dev-tools';
    else if ((mod && (c === 'KeyC' || c === 'KeyX')) || (e.ctrlKey && c === 'Insert')) hit = 'copy';
    else if ((mod && c === 'KeyV') || (e.shiftKey && c === 'Insert')) hit = 'paste';
    else if (mod && c === 'KeyP') hit = 'print';
    else if (mod && c === 'KeyS') hit = 'save';
    else if (mod && c === 'KeyA' && !isField(e.target)) { e.preventDefault(); return; }
    if (hit) block(e, hit);
  }
  function onKeyUp(e) {
    chordOff(e);
    if (S.open && (e.key === 'PrintScreen' || e.code === 'PrintScreen')) {
      /* Windows gives the page Print Screen only as it is let go, after the picture: cover the page for a moment and
         put a space on the clipboard in its place (the browser allows this only sometimes) */
      note('screen-keys'); S.hide.flash = true; showCover();
      setTimeout(function () { S.hide.flash = false; showCover(); }, 1500);
      try { if (root.navigator.clipboard && root.navigator.clipboard.writeText) root.navigator.clipboard.writeText(' ').catch(function () {}); } catch (x) {}
    }
  }
  root.addEventListener('keydown', onKeyDown, true);
  root.addEventListener('keyup', onKeyUp, true);
  ['mousemove', 'mousedown', 'wheel', 'pointerdown'].forEach(function (t) { root.addEventListener(t, chordOff, { capture: true, passive: true }); });
  ['copy', 'cut'].forEach(function (t) { doc.addEventListener(t, function (e) { block(e, 'copy'); }, true); });
  doc.addEventListener('paste', function (e) { block(e, 'paste'); }, true);
  doc.addEventListener('drop', function (e) { block(e, 'paste'); }, true);
  doc.addEventListener('beforeinput', function (e) { if (/^insertFrom(Paste|Drop|Yank)/.test(String(e.inputType || ''))) block(e, 'paste'); }, true);
  doc.addEventListener('contextmenu', function (e) { block(e, 'right-click'); }, true);
  doc.addEventListener('dragstart', function (e) { block(e, ''); }, true);
  doc.addEventListener('selectstart', function (e) { if (S.open && !isField(e.target)) e.preventDefault(); }, true);
  root.addEventListener('beforeprint', function () { if (!S.open) return; S.hide.print = true; showCover(); note('print'); });
  root.addEventListener('afterprint', function () { S.hide.print = false; showCover(); });
  /* the window not in use: its own blur only (an element's blur never reaches a bubbling listener on window) */
  root.addEventListener('blur', function (e) { if (e.target !== root) return; S.hide.away = true; showCover(); });
  root.addEventListener('focus', function (e) { if (e.target !== root) return; S.hide.away = false; showCover(); });
  doc.addEventListener('visibilitychange', function () {
    S.hide.away = doc.hidden || !doc.hasFocus(); showCover();
    if (!doc.hidden && S.open) drawClock();
  });
  cover.addEventListener('click', function (e) {
    S.hide.away = !doc.hasFocus(); S.hide.flash = false;
    if (!(e.metaKey && e.shiftKey)) { S.hide.keys = false; S.chord = null; }      /* a click with the keys still held keeps it covered */
    showCover();
  });
  root.addEventListener('pagehide', function () { sendFlags(true); });
  root.addEventListener('pageshow', function (e) { if (e.persisted && S.open) drawClock(); });

  /* the buttons on the screens */
  gate.addEventListener('click', function (e) {
    var t = e.target.closest ? e.target.closest('button') : null; if (!t) return;
    if (t.hasAttribute('data-start')) { t.disabled = true; ask(true); }
    else if (t.hasAttribute('data-again')) ask(false);
    else if (t.hasAttribute('data-out')) { if (SI) SI.out(); screenSignIn(); }
  });

  /* the one sign-in: here, renewed in the background, or in another tab of the site */
  if (SI) SI.on(function (v) {
    if (!v) { if (S.open) wipe(); return screenSignIn(); }
    if (!SI.fresh(v) || S.renewing) return;
    if (S.open && S.me === v.email) return;          /* the same person, renewed */
    if (S.open) wipe();
    ask(false);
  });

  /* start */
  if (!URL_) screenError('This page is not set up on this website.');
  else if (!root.DecompressionStream) screenOld();
  else if (!SI) screenError();
  else if (SI.who()) ask(false);
  else screenSignIn();
})(window);
