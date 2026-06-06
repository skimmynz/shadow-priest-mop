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

  /* ── Tabbed stream card (Twitch / YouTube) ─────────── */

  function initStreamTabs() {
    var cards = document.querySelectorAll('.stream-card--tabbed');

    cards.forEach(function (card) {
      var embed = card.querySelector('.stream-embed');
      var tabs = card.querySelectorAll('.stream-tab');
      if (!embed || !tabs.length) return;

      tabs.forEach(function (tab) {
        tab.addEventListener('click', function () {
          if (tab.classList.contains('is-active')) return;

          tabs.forEach(function (t) {
            t.classList.remove('is-active');
            t.setAttribute('aria-selected', 'false');
          });
          tab.classList.add('is-active');
          tab.setAttribute('aria-selected', 'true');

          var existing = embed.querySelector('iframe');
          if (existing) existing.remove();

          embed.setAttribute('data-src', tab.getAttribute('data-src'));
          embed.setAttribute('data-title', tab.getAttribute('data-title') || '');
          loadStream(embed);
        });
      });
    });
  }

  /* ── Init ──────────────────────────────────────────── */

  function init() {
    initLazyStreams();
    initStreamTabs();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
