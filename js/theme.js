// Toggle Mode Gelap / Terang (tersimpan di localStorage)
(function () {
  var tersimpan = localStorage.getItem('tema') || 'light';
  document.documentElement.setAttribute('data-theme', tersimpan === 'gelap' ? 'dark' : tersimpan);

  document.addEventListener('DOMContentLoaded', function () {
    var tombol = document.getElementById('themeToggle');
    function perbaruiIkon() {
      if (!tombol) return;
      tombol.innerHTML = document.documentElement.getAttribute('data-theme') === 'dark'
        ? '<i class="fas fa-sun"></i>'
        : '<i class="fas fa-moon"></i>';
    }
    perbaruiIkon();
    if (tombol) {
      tombol.addEventListener('click', function () {
        var baru = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', baru);
        localStorage.setItem('tema', baru);
        perbaruiIkon();
      });
    }

    // Navbar bertambah bayangan saat digulir
    var navbar = document.querySelector('.navbar');
    if (navbar) {
      window.addEventListener('scroll', function () {
        navbar.classList.toggle('scrolled', window.scrollY > 10);
      }, { passive: true });
    }

    // Animasi scroll: elemen muncul berurutan saat terlihat
    var target = document.querySelectorAll('.dash-card, .info-card, .panel, .feature-card, .team-card, .testimonial-card, .section-header, .panel-grid .panel, .step');
    target.forEach(function (el) { el.classList.add('reveal'); });
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); } });
      }, { threshold: 0.1 });
      target.forEach(function (el) { io.observe(el); });
    } else {
      target.forEach(function (el) { el.classList.add('visible'); });
    }
  });
})();
