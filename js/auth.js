/* ==========================================================================
   AI Daily Healthy Assistant — fungsi bersama (dimuat di semua halaman)
   - App.api()  : kirim permintaan ke server (fetch)
   - App.esc()  : amankan teks sebelum dimasukkan ke HTML
   - App.ready  : Promise berisi data user yang login (atau null)
   - Menambahkan tombol Masuk / Daftar / Keluar di navbar
   ========================================================================== */
(function () {
  'use strict';

  // Kirim permintaan ke server. Jika gagal, lempar Error berisi pesan dari server.
  async function api(url, method, body) {
    const opsi = { method: method || 'GET', headers: {} };
    if (body !== undefined) {
      opsi.headers['Content-Type'] = 'application/json';
      opsi.body = JSON.stringify(body);
    }
    let res;
    try {
      res = await fetch(url, opsi);
    } catch (e) {
      throw new Error('Tidak bisa terhubung ke server. Pastikan server sudah dijalankan (npm start).');
    }
    let data = {};
    try { data = await res.json(); } catch (e) {}
    if (!res.ok) throw new Error(data.pesan || 'Terjadi kesalahan.');
    return data;
  }

  // Ubah karakter khusus HTML agar teks dari pengguna tidak bisa menyisipkan kode
  function esc(teks) {
    return String(teks)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // Jawaban AI sering memakai **tebal**. Teks di-escape dulu (aman dari XSS), baru ditebalkan.
  function formatTeks(teks) {
    return esc(teks).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  }

  // Tampilkan pesan di elemen .form-msg
  function tampilPesan(el, teks, sukses) {
    if (!el) return;
    el.textContent = teks;
    el.className = 'form-msg tampil ' + (sukses ? 'ok' : 'error');
  }

  const App = { api: api, esc: esc, formatTeks: formatTeks, tampilPesan: tampilPesan, user: null };
  window.App = App;

  // Cek siapa yang login, lalu pasang menu di navbar
  App.ready = api('/api/auth/me')
    .then(function (d) { App.user = d.user; return d.user; })
    .catch(function () { return null; })
    .then(function (user) { pasangMenu(user); pasangAvatarAtas(user); return user; });

  // Tampilkan foto profil pengguna langsung di sudut kanan navbar (layar kecil)
  function pasangAvatarAtas(user) {
    if (!user) return;
    const nav = document.querySelector('.nav-container');
    if (!nav || nav.querySelector('.nav-avatar-top')) return;

    const isi = user.foto
      ? '<img src="' + esc(user.foto) + '" alt="Foto profil">'
      : '<i class="fas fa-user"></i>';

    const a = document.createElement('a');
    a.href = '/pages/profil';
    a.className = 'nav-avatar-top';
    a.title = user.nama;
    a.setAttribute('aria-label', 'Profil ' + user.nama);
    a.innerHTML = isi;

    const tema = nav.querySelector('#themeToggle');
    if (tema) nav.insertBefore(a, tema);
    else nav.appendChild(a);
  }

  function pasangMenu(user) {
    const daftarMenu = document.querySelector('.nav-links');
    if (!daftarMenu) return;

    if (user) {
      if (user.role === 'admin') {
        daftarMenu.insertAdjacentHTML('beforeend', '<li><a href="/pages/admin">Admin</a></li>');
      }
      const avatarHTML = user.foto
        ? '<img src="' + esc(user.foto) + '" alt="Foto profil" style="width:34px;height:34px;border-radius:50%;object-fit:cover;border:2px solid var(--primary);">'
        : '<i class="fas fa-user-circle"></i>';
      daftarMenu.insertAdjacentHTML('beforeend',
        '<li><a href="/pages/profil" class="nav-user">' + avatarHTML + ' ' + esc(user.nama.split(' ')[0]) + '</a></li>' +
        '<li><a href="#" id="btnKeluar" class="btn btn-secondary">Keluar</a></li>');
      document.getElementById('btnKeluar').addEventListener('click', async function (e) {
        e.preventDefault();
        try { await api('/api/auth/logout', 'POST'); } catch (err) {}
        window.location.href = '/index';
      });
    } else {
      daftarMenu.insertAdjacentHTML('beforeend',
        '<li><a href="/pages/masuk">Masuk</a></li>' +
        '<li><a href="/pages/daftar" class="btn btn-primary">Daftar</a></li>');
    }
  }
})();
