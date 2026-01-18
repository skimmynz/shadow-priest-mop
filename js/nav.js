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
    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll('.nav-links a');
    
    navLinks.forEach(link => {
      link.classList.remove('active');
      const linkPath = new URL(link.href).pathname;
      
      // Handle root path
      if (currentPath === '/' || currentPath === '/index.html') {
        if (linkPath === '/' || linkPath === '/index.html') {
          link.classList.add('active');
        }
      } else if (linkPath === currentPath) {
        link.classList.add('active');
      }
    });
  }

  // Initialize on DOM load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initMobileMenu();
      setActiveNavLink();
    });
  } else {
    initMobileMenu();
    setActiveNavLink();
  }
})();
