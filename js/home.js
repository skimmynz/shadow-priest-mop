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

  /* ── Init ──────────────────────────────────────────── */

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLazyStreams);
  } else {
    initLazyStreams();
  }
})();
