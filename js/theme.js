/* ============================================================
   theme.js — the bright and the dark version of a page (Daniel, 1 Oct 2026: "have a bright version").
   Loaded in <head>, before the page draws, so it never flashes the wrong colours. It puts data-theme="light" or
   "dark" on <html>: the computer's own setting (followed if it changes), until the reader presses a
   [data-theme-toggle] button. That choice is remembered on this computer only, under localStorage "biology.theme",
   which holds "light" or "dark" and nothing else (nothing about anybody). The page's CSS gives every colour a value
   in each version (css/analysis.css). The teacher page keeps its own copy of these lines (apps-script/Teacher.html).
   ============================================================ */
(function (root, doc) {
  'use strict';
  var KEY = 'biology.theme', de = doc.documentElement, mq = null;
  try { mq = root.matchMedia('(prefers-color-scheme: light)'); } catch (e) {}
  function saved() { try { var v = root.localStorage.getItem(KEY); return v === 'light' || v === 'dark' ? v : ''; } catch (e) { return ''; } }
  function current() { return saved() || (mq && mq.matches ? 'light' : 'dark'); }
  /* The button says what pressing it does: "☀ Bright" on the dark version, "☾ Dark" on the bright one. */
  function label() {
    var light = de.getAttribute('data-theme') === 'light', bs = doc.querySelectorAll('[data-theme-toggle]');
    for (var i = 0; i < bs.length; i++) {
      bs[i].innerHTML = light ? '<span aria-hidden="true">☾</span> Dark' : '<span aria-hidden="true">☀</span> Bright';
      bs[i].setAttribute('aria-label', light ? 'Show the dark version of this page' : 'Show the bright version of this page');
    }
  }
  function apply(t) {
    de.setAttribute('data-theme', t);
    var m = doc.querySelector('meta[name="theme-color"]');
    if (m) m.setAttribute('content', t === 'light' ? '#F2F5F7' : '#0A141C');
    label();
  }
  apply(current());
  if (mq) {
    var follow = function () { if (!saved()) apply(current()); };
    if (mq.addEventListener) mq.addEventListener('change', follow); else if (mq.addListener) mq.addListener(follow);
  }
  doc.addEventListener('click', function (e) {
    var b = e.target && e.target.closest ? e.target.closest('[data-theme-toggle]') : null;
    if (!b) return;
    var t = de.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    try { root.localStorage.setItem(KEY, t); } catch (x) {}
    apply(t);
  });
  doc.addEventListener('DOMContentLoaded', label);
  root.Theme = { current: function () { return de.getAttribute('data-theme'); }, label: label };
})(window, document);
