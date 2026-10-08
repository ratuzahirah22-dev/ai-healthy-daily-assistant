/* ==========================================================================
   Form Daftar & Masuk (pages/daftar dan pages/masuk)
   ========================================================================== */
(function () {
  'use strict';

  const formDaftar = document.getElementById('formDaftar');
  const formMasuk = document.getElementById('formMasuk');
  const pesan = document.getElementById('formMsg');

  // Jika sudah login, tidak perlu daftar/masuk lagi
  // Admin diarahkan ke panel admin, pengguna biasa ke dashboard kesehatan
  function halamanTujuan(user) {
    return user.role === 'admin' ? '/pages/admin' : '/pages/kesehatan';
  }

  App.ready.then(function (user) {
    if (user) window.location.href = halamanTujuan(user);
  });

  function ambil(form) {
    const data = {};
    new FormData(form).forEach(function (nilai, nama) { data[nama] = nilai; });
    return data;
  }

  async function kirim(form, alamat, tombol, teksTombol) {
    tombol.disabled = true;
    tombol.textContent = 'Memproses...';
    try {
      const hasil = await App.api(alamat, 'POST', ambil(form));
      window.location.href = halamanTujuan(hasil.user);
    } catch (err) {
      App.tampilPesan(pesan, err.message, false);
      tombol.disabled = false;
      tombol.textContent = teksTombol;
    }
  }

  if (formDaftar) {
    formDaftar.addEventListener('submit', function (e) {
      e.preventDefault();
      const d = ambil(formDaftar);
      if (d.password !== d.konfirmasi) {
        App.tampilPesan(pesan, 'Konfirmasi password tidak sama.', false);
        return;
      }
      kirim(formDaftar, '/api/auth/register', formDaftar.querySelector('button'), 'Buat Akun');
    });
  }

  if (formMasuk) {
    formMasuk.addEventListener('submit', function (e) {
      e.preventDefault();
      kirim(formMasuk, '/api/auth/login', formMasuk.querySelector('button'), 'Masuk');
    });
  }
})();
