// Navigation module
(function() {
  // Mobile menu toggle
  function initMobileMenu() {
    const mobileMenuToggle = document.getElementById('mobileMenuToggle');
    const navLinks = document.getElementById('navLinks');

    if (!mobileMenuToggle || !navLinks) return;

    mobileMenuToggle.addEventListener('click', () => {
      navLinks.classList.toggle('mobile-open');
      mobileMenuToggle.textContent = navLinks.classList.contains('mobile-open') ? '✕' : '☰';
    });

    navLinks.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        navLinks.classList.remove('mobile-open');
        mobileMenuToggle.textContent = '☰';
      });
    });

    document.addEventListener('click', (e) => {
      if (!e.target.closest('.top-nav')) {
        navLinks.classList.remove('mobile-open');
        mobileMenuToggle.textContent = '☰';
      }
    });
  }

  // Set active nav link based on current page
  function setActiveNavLink() {
    // Normalize so /rankings.html matches the nav's /rankings link
    const normalize = p => p.replace(/\.html$/, '').replace(/\/index$/, '/') || '/';
    const currentPath = normalize(window.location.pathname);
    const navLinks = document.querySelectorAll('.nav-links a');

    navLinks.forEach(link => {
      link.classList.remove('active');
      const linkPath = normalize(new URL(link.href).pathname);
      if (linkPath === currentPath) {
        link.classList.add('active');
      }
    });
  }

  // Set dynamic footer year
  function setFooterYear() {
    var el = document.querySelector('.footer-year');
    if (el) el.textContent = new Date().getFullYear();
  }

  // Initialize on DOM load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initMobileMenu();
      setActiveNavLink();
      setFooterYear();
    });
  } else {
    initMobileMenu();
    setActiveNavLink();
    setFooterYear();
  }
})();
