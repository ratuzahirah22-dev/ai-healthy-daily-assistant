/* ==========================================================================
   Beranda — statistik, testimoni, ulasan, dan newsletter dari database
   ========================================================================== */
(function () {
  'use strict';

  const $ = function (id) { return document.getElementById(id); };

  // ---------- Statistik asli ----------
  App.api('/api/stats').then(function (s) {
    $('statPengguna').textContent = s.pengguna.toLocaleString('id-ID');
    $('statKonsultasi').textContent = s.konsultasi.toLocaleString('id-ID');
    $('statRating').textContent = s.rating ? s.rating.toLocaleString('id-ID') : '–';
  }).catch(function () {});

  // ---------- Testimoni ----------
  function muatTestimoni() {
    return App.api('/api/testimonials').then(function (d) {
      if (!d.testimoni.length) return;
      $('testiGrid').innerHTML = d.testimoni.map(function (t, i) {
        let bintang = '';
        for (let n = 0; n < t.rating; n++) bintang += '<i class="fas fa-star"></i>';
        return '<div class="testimonial-card' + (i === 1 ? ' featured' : '') + '">' +
          '<div class="stars">' + bintang + '</div>' +
          '<p>"' + App.esc(t.isi) + '"</p>' +
          '<div class="testimonial-author">' +
            '<div class="author-avatar"><i class="fas fa-user"></i></div>' +
            '<div><strong>' + App.esc(t.nama) + '</strong><span>' + App.esc(t.kota) + '</span></div>' +
          '</div></div>';
      }).join('');
    }).catch(function () {});
  }
  muatTestimoni();

  // ---------- Form ulasan (hanya untuk yang login) ----------
  App.ready.then(function (user) {
    $('reviewBox').hidden = !user;
    $('reviewPrompt').hidden = !!user;
    if (user) cekStatusUlasan();
  });

  // Ulasan tidak tampil publik sebelum disetujui admin — beri tahu statusnya di sini
  const STATUS_ULASAN = {
    menunggu: 'Ulasanmu sedang menunggu persetujuan admin. Ulasan baru atau revisi ulang akan tampil setelah disetujui.',
    draft: 'Ulasanmu sedang disimpan admin sebagai draft, jadi belum tampil di beranda.',
    ditolak: 'Ulasanmu belum disetujui admin, jadi belum tampil di beranda. Silakan perbaiki lalu kirim ulang.',
    diterima: 'Ulasanmu sudah disetujui admin dan tampil di beranda.'
  };

  async function cekStatusUlasan() {
    try {
      const d = await App.api('/api/testimonials/saya');
      if (!d.ulasan) return;
      App.tampilPesan($('ulasanMsg'), STATUS_ULASAN[d.ulasan.status] || '', d.ulasan.status !== 'ditolak');
      if (d.ulasan.status === 'diterima') {
        $('ulasanRating').value = String(d.ulasan.rating);
        $('ulasanKota').value = d.ulasan.kota;
        $('ulasanIsi').value = d.ulasan.isi;
      }
    } catch (e) {}
  }

  $('formUlasan').addEventListener('submit', async function (e) {
    e.preventDefault();
    const msg = $('ulasanMsg');
    const data = {
      rating: Number($('ulasanRating').value),
      kota: $('ulasanKota').value,
      isi: $('ulasanIsi').value
    };
    try {
      const hasil = await App.api('/api/testimonials', 'POST', data);
      App.tampilPesan(msg, hasil.pesan, true);
      $('ulasanIsi').value = '';
      muatTestimoni();
    } catch (err) {
      App.tampilPesan(msg, err.message, false);
    }
  });

  // ---------- Newsletter ----------
  $('newsletterBtn').addEventListener('click', async function () {
    const msg = $('newsletterMsg');
    try {
      const hasil = await App.api('/api/newsletter', 'POST', { email: $('newsletterEmail').value });
      msg.textContent = hasil.pesan;
      msg.style.color = 'var(--primary-light)';
      $('newsletterEmail').value = '';
    } catch (err) {
      msg.textContent = err.message;
      msg.style.color = '#fca5a5';
    }
  });
})();
