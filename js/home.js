/* ═══════════════════════════════════════════════════════
   Home Page — js/home.js  v3
   Lazy stream loading
   ═══════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* ── Lazy stream loading ───────────────────────────── */

  function initLazyStreams() {
    var targets = document.querySelectorAll('.stream-embed[data-src]');
    if (!targets.length) return;

    if ('IntersectionObserver' in window) {
      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            loadStream(entry.target);
            observer.unobserve(entry.target);
          }
        });
      }, { rootMargin: '300px' });

      targets.forEach(function (el) { observer.observe(el); });
    } else {
      targets.forEach(loadStream);
    }
  }

  function loadStream(container) {
    var src = container.getAttribute('data-src');
    var title = container.getAttribute('data-title') || '';
    if (!src) return;

    var iframe = document.createElement('iframe');
    iframe.src = src;
    iframe.setAttribute('allowfullscreen', '');
    iframe.setAttribute('loading', 'lazy');
    if (title) iframe.setAttribute('title', title);

    var placeholder = container.querySelector('.stream-placeholder');
    if (placeholder) placeholder.remove();

    container.appendChild(iframe);
    container.removeAttribute('data-src');
  }

  /* ── SoO release countdown ─────────────────────────── */

  function initCountdown() {
    var box = document.getElementById('sooCountdown');
    if (!box) return;

    var launch = new Date(box.getAttribute('data-launch')).getTime();
    if (isNaN(launch)) return;

    var clock = document.getElementById('sooCountdownClock');
    var live = document.getElementById('sooCountdownLive');
    var nums = {
      days: box.querySelector('[data-unit="days"]'),
      hours: box.querySelector('[data-unit="hours"]'),
      mins: box.querySelector('[data-unit="mins"]'),
      secs: box.querySelector('[data-unit="secs"]')
    };

    function pad(n) { return n < 10 ? '0' + n : '' + n; }

    function tick() {
      var diff = launch - Date.now();

      if (diff <= 0) {
        if (clock) clock.hidden = true;
        if (live) live.hidden = false;
        box.hidden = false;
        clearInterval(timer);
        return;
      }

      var s = Math.floor(diff / 1000);
      nums.days.textContent = Math.floor(s / 86400);
      nums.hours.textContent = pad(Math.floor((s % 86400) / 3600));
      nums.mins.textContent = pad(Math.floor((s % 3600) / 60));
      nums.secs.textContent = pad(s % 60);
      box.hidden = false;
    }

    var timer = setInterval(tick, 1000);
    tick();
  }

  /* ── Init ──────────────────────────────────────────── */

  function init() {
    initLazyStreams();
    initCountdown();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
