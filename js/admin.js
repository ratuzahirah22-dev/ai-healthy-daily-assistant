/* ==========================================================================
   Dashboard Admin — ringkasan, pemakaian chatbot per pengguna, pengaturan Chatbot AI
   Admin hanya melihat angka pemakaian (pertanyaan & token), bukan isi chat pengguna.
   Server tetap memeriksa role admin di setiap permintaan; pemeriksaan di sini
   hanya untuk menampilkan atau menyembunyikan halaman.
   ========================================================================== */
(function () {
  'use strict';

  const $ = function (id) { return document.getElementById(id); };
  const angka = function (n) { return Number(n).toLocaleString('id-ID'); };
  let semuaPengguna = [];
  let promptBawaan = '';
  let idResetAktif = null;

  // "2026-10-05 16:30:00" -> "5 Okt 2026, 16.30"
  function waktu(teks) {
    if (!teks) return '—';
    const d = new Date(teks.replace(' ', 'T'));
    if (isNaN(d)) return teks;
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) + ', ' +
      d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  }

  // ---------- Tab ----------
  document.querySelectorAll('.admin-tabs button').forEach(function (tombol) {
    tombol.addEventListener('click', function () {
      document.querySelectorAll('.admin-tabs button').forEach(function (t) { t.classList.remove('aktif'); });
      document.querySelectorAll('.tab-isi').forEach(function (t) { t.hidden = true; });
      tombol.classList.add('aktif');
      $('tab-' + tombol.dataset.tab).hidden = false;
      if (tombol.dataset.tab === 'ringkasan') muatRingkasan();
      if (tombol.dataset.tab === 'pengguna') muatPengguna();
      if (tombol.dataset.tab === 'ulasan') muatUlasan();
    });
  });

  // ---------- Ringkasan ----------
  async function muatRingkasan() {
    const d = await App.api('/api/admin/ringkasan');
    const p = d.pengguna;
    const c = d.chatbot;

    $('sTotal').textContent = angka(p.total);
    $('sBaru').textContent = angka(p.baru_7_hari) + ' pendaftar baru dalam 7 hari.';
    $('sAktifHari').textContent = angka(p.aktif_hari_ini);
    $('sAktif7').textContent = angka(p.aktif_7_hari);
    $('sAktifPersen').textContent = p.total ? Math.round(p.aktif_7_hari / p.total * 100) + '% dari seluruh pengguna.' : 'Belum ada pengguna.';
    $('sPenggunaChat').textContent = angka(c.pengguna_chat);
    $('sPenggunaChat7').textContent = angka(c.pengguna_chat_7_hari) + ' pengguna chat dalam 7 hari.';
    $('sPesan').textContent = angka(c.pesan);
    $('sPesanHari').textContent = angka(c.pesan_hari_ini) + ' pertanyaan hari ini.';
    $('sTokenTotal').textContent = angka(c.token_total);
    $('sTokenHari').textContent = angka(c.token_hari_ini) + ' token hari ini.';
    $('sToken7').textContent = angka(c.token_7_hari);
    $('sTokenRata').textContent = c.pesan ? angka(Math.round(c.token_total / c.pesan)) : '0';
    $('sPersenChat').textContent = p.total ? Math.round(c.pengguna_chat / p.total * 100) + '%' : '0%';

    $('statusBot').className = 'status-bot ' + (c.aktif ? 'on' : 'off');
    $('statusBot').innerHTML = c.aktif
      ? '<i class="fas fa-circle-check"></i> Chatbot AI <strong>AKTIF</strong> — model ' + App.esc(c.model)
      : '<i class="fas fa-circle-exclamation"></i> Chatbot AI <strong>NONAKTIF</strong> — aktifkan di tab Pengaturan Chatbot.';

    // Grafik batang 7 hari
    const maks = Math.max.apply(null, d.grafik.map(function (g) { return g.jumlah; }).concat(1));
    $('grafik').innerHTML = d.grafik.map(function (g) {
      const tgl = new Date(g.tanggal + 'T00:00:00').toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric' });
      return '<div class="batang" title="' + angka(g.token) + ' token"><span class="nilai">' + g.jumlah + '</span>' +
        '<div class="isi" style="height:' + Math.max(g.jumlah / maks * 100, g.jumlah ? 4 : 1) + '%"></div>' +
        '<span class="label">' + App.esc(tgl) + '</span></div>';
    }).join('');

    muatUlasan(); // hanya untuk memperbarui lonceng jumlah ulasan menunggu
  }

  // ---------- Pengguna & chat ----------
  async function muatPengguna() {
    const d = await App.api('/api/admin/pengguna');
    semuaPengguna = d.pengguna;
    tampilPengguna();
  }

  function tampilPengguna() {
    const kata = $('cari').value.trim().toLowerCase();
    const hanyaChat = $('hanyaChat').checked;
    const urut = $('urut').value;
    const daftar = semuaPengguna.filter(function (u) {
      if (hanyaChat && !u.pesan) return false;
      return !kata || u.nama.toLowerCase().indexOf(kata) >= 0 || u.email.toLowerCase().indexOf(kata) >= 0;
    });
    // Urutan bawaan dari server adalah "terakhir aktif"
    if (urut === 'token') daftar.sort(function (x, y) { return y.token_total - x.token_total; });
    if (urut === 'pesan') daftar.sort(function (x, y) { return y.pesan - x.pesan; });

    if (!daftar.length) {
      $('penggunaBody').innerHTML = '<tr><td colspan="7" class="kosong">Tidak ada pengguna yang cocok.</td></tr>';
      return;
    }
    $('penggunaBody').innerHTML = daftar.map(function (u) {
      return '<tr><td><strong>' + App.esc(u.nama) + '</strong></td><td>' + App.esc(u.email) + '</td>' +
        '<td>' + waktu(u.last_seen) + '</td>' +
        '<td>' + (u.pesan ? '<span class="tag tag-green">' + angka(u.pesan) + ' pertanyaan</span>' : '—') + '</td>' +
        '<td><strong>' + (u.token_total ? angka(u.token_total) : '—') + '</strong></td>' +
        '<td>' + (u.token_7_hari ? angka(u.token_7_hari) : '—') + '</td>' +
        '<td class="aksi-user"><button type="button" class="link-btn btn-reset" data-id="' + u.id +
        '" data-nama="' + App.esc(u.nama) + '"><i class="fas fa-key"></i> Reset password</button></td></tr>';
    }).join('');
  }

  // ---------- Reset password pengguna ----------
  // Panel inline (bukan modal) supaya konsisten dengan gaya admin yang sudah ada.
  function tutupPanelReset() {
    const panel = $('panelReset');
    if (!panel) return;
    panel.hidden = true;
    idResetAktif = null;
    $('inResetPass').value = '';
    $('msgReset').textContent = '';
    $('msgReset').className = 'form-msg';
  }

  function bukaPanelReset(id, nama) {
    const panel = $('panelReset');
    if (!panel) return;
    idResetAktif = id;
    panel.hidden = false;
    $('judulReset').innerHTML = '<i class="fas fa-key"></i> Reset password untuk <strong>' + App.esc(nama) + '</strong>';
    $('inResetPass').value = '';
    $('inResetPass').focus();
    App.tampilPesan($('msgReset'), 'Password baru minimal 6 karakter.', true);
  }

  $('penggunaBody').addEventListener('click', function (e) {
    const tombol = e.target.closest('.btn-reset');
    if (!tombol) return;
    bukaPanelReset(Number(tombol.dataset.id), tombol.dataset.nama);
  });

  if ($('btnBatalReset')) $('btnBatalReset').addEventListener('click', tutupPanelReset);

  if ($('btnBuatPass')) $('btnBuatPass').addEventListener('click', function () {
    // Acak 16 karakter dari himpunan aman; cukup kuat sebagai password sementara
    const huruf = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%^&*';
    const buf = new Uint32Array(16);
    crypto.getRandomValues(buf);
    $('inResetPass').value = Array.from(buf, function (n) { return huruf[n % huruf.length]; }).join('');
    $('inResetPass').focus();
  });

  if ($('formReset')) $('formReset').addEventListener('submit', async function (e) {
    e.preventDefault();
    if (!idResetAktif) return;
    const msg = $('msgReset');
    try {
      const d = await App.api('/api/admin/pengguna/' + idResetAktif + '/reset-password', 'POST', {
        password_baru: $('inResetPass').value
      });
      App.tampilPesan(msg, d.pesan + ' Kabari pengguna agar segera ganti password.', true);
      $('inResetPass').value = '';
    } catch (err) {
      App.tampilPesan(msg, err.message, false);
    }
  });

  $('cari').addEventListener('input', tampilPengguna);
  $('hanyaChat').addEventListener('change', tampilPengguna);
  $('urut').addEventListener('change', tampilPengguna);


  // ---------- Moderasi ulasan ----------
  // Ulasan tidak tampil publik di beranda sebelum statusnya 'diterima'.
  let semuaUlasan = [];

  const LABEL_STATUS = {
    menunggu: '<span class="tag tag-orange">Menunggu</span>',
    draft: '<span class="tag tag-blue">Draft</span>',
    diterima: '<span class="tag tag-green">Tampil</span>',
    ditolak: '<span class="tag tag-purple">Ditolak</span>'
  };

  async function muatUlasan() {
    const d = await App.api('/api/admin/ulasan');
    semuaUlasan = d.ulasan;
    const j = d.jumlah;

    $('ringkasUlasan').innerHTML =
      '<div class="kotak-angka"><span>Menunggu</span><strong>' + angka(j.menunggu) + '</strong></div>' +
      '<div class="kotak-angka"><span>Draft</span><strong>' + angka(j.draft) + '</strong></div>' +
      '<div class="kotak-angka"><span>Tampil di beranda</span><strong>' + angka(j.diterima) + '</strong></div>' +
      '<div class="kotak-angka"><span>Ditolak</span><strong>' + angka(j.ditolak) + '</strong></div>' +
      '<div class="kotak-angka"><span>Total ulasan</span><strong>' + angka(j.total) + '</strong></div>';

    // Lonceng kecil di tab: jumlah yang belum ditinjau
    $('badgeMenunggu').hidden = !j.menunggu;
    $('badgeMenunggu').textContent = angka(j.menunggu);

    tampilUlasan();
  }

  function tampilUlasan() {
    const kata = $('cariUlasan').value.trim().toLowerCase();
    let status = $('filterStatus').value;
    if ($('hanyaMenunggu').checked) status = 'menunggu';

    const daftar = semuaUlasan.filter(function (u) {
      if (status && u.status !== status) return false;
      if (!kata) return true;
      return u.nama.toLowerCase().indexOf(kata) >= 0 ||
        u.kota.toLowerCase().indexOf(kata) >= 0 ||
        u.isi.toLowerCase().indexOf(kata) >= 0;
    });

    if (!daftar.length) {
      $('ulasanBody').innerHTML = '<tr><td colspan="6" class="kosong">Tidak ada ulasan yang cocok.</td></tr>';
      return;
    }

    $('ulasanBody').innerHTML = daftar.map(function (u) {
      let bintang = '';
      for (let n = 0; n < u.rating; n++) bintang += '<i class="fas fa-star"></i>';

      // Tombol aksi menyesuaikan status: draft bisa diterbitkan, yang sudah tampil
      // bisa diturunkan ke draft supaya tidak ikut hilang permanen.
      const tombol = function (kelas, ikon, teks, status) {
        return '<button type="button" class="link-btn ' + kelas + '" data-id="' + u.id + '"' +
          (status ? ' data-status="' + status + '"' : '') + '><i class="fas fa-' + ikon + '"></i> ' + teks + '</button>';
      };
      let aksi = '';
      if (u.status === 'diterima') {
        aksi += tombol('btn-draft', 'pen-to-square', 'Jadikan draft', 'draft');
        aksi += tombol('btn-tolak', 'ban', 'Tolak', 'ditolak');
      } else if (u.status === 'draft') {
        aksi += tombol('btn-terima', 'check', 'Terbitkan', 'diterima');
        aksi += tombol('btn-tolak', 'ban', 'Tolak', 'ditolak');
      } else if (u.status === 'ditolak') {
        aksi += tombol('btn-terima', 'check', 'Setujui', 'diterima');
      } else {
        aksi += tombol('btn-terima', 'check', 'Setujui', 'diterima');
        aksi += tombol('btn-draft', 'pen-to-square', 'Simpan draft', 'draft');
        aksi += tombol('btn-tolak', 'ban', 'Tolak', 'ditolak');
      }
      aksi += tombol('btn-hapus', 'trash', 'Hapus', '');

      return '<tr><td class="kolom-pengirim"><strong>' + App.esc(u.nama) + '</strong>' +
          '<span class="sub-teks">' + App.esc(u.kota || 'Tanpa kota') + '</span></td>' +
        '<td class="isi-ulasan">' + App.esc(u.isi) + '</td>' +
        '<td class="bintang-ulasan">' + bintang + '</td>' +
        '<td>' + LABEL_STATUS[u.status] + '</td>' +
        '<td>' + waktu(u.created_at) + '</td>' +
        '<td class="aksi-user">' + aksi + '</td></tr>';
    }).join('');
  }

  const KONFIRMASI = {
    diterima: 'Terbitkan ulasan ini agar tampil di beranda?',
    ditolak: 'Tolak ulasan ini? Ulasan disembunyikan dari beranda.',
    draft: 'Simpan ulasan ini sebagai draft? Ulasan tidak akan tampil di beranda.'
  };

  $('ulasanBody').addEventListener('click', async function (e) {
    const tombol = e.target.closest('[data-id]');
    if (!tombol) return;
    const id = tombol.dataset.id;
    const status = tombol.dataset.status;
    const msg = $('ulasanMsg');

    if (!status) {
      if (!window.confirm('Hapus ulasan ini secara permanen?')) return;
      try {
        const d = await App.api('/api/admin/ulasan/' + id, 'DELETE');
        App.tampilPesan(msg, d.pesan, true);
        await muatUlasan();
      } catch (err) {
        App.tampilPesan(msg, err.message, false);
      }
      return;
    }

    if (!window.confirm(KONFIRMASI[status])) return;
    try {
      const d = await App.api('/api/admin/ulasan/' + id + '/status', 'POST', { status: status });
      App.tampilPesan(msg, d.pesan, true);
      await muatUlasan();
    } catch (err) {
      App.tampilPesan(msg, err.message, false);
    }
  });

  $('cariUlasan').addEventListener('input', tampilUlasan);
  $('filterStatus').addEventListener('change', tampilUlasan);
  $('hanyaMenunggu').addEventListener('change', function () {
    // Saklar "hanya menunggu" menggantikan pilihan dropdown
    if (this.checked) $('filterStatus').value = '';
    tampilUlasan();
  });


  // ---------- Pengaturan chatbot ----------
  function isiForm(d) {
    $('aktif').checked = d.aktif;
    $('baseUrl').value = d.base_url;
    $('model').value = d.model;
    $('temperature').value = d.temperature;
    $('maxTokens').value = d.max_tokens;
    $('prompt').value = d.system_prompt;
    $('apiKey').value = '';
    $('hapusKey').checked = false;
    $('barisHapusKey').hidden = !d.ada_key;
    promptBawaan = d.prompt_bawaan;

    const status = $('statusKunci');
    if (d.ada_key) {
      status.textContent = 'API key tersimpan (berakhiran ' + d.key_akhir + '). Status: ' + (d.aktif ? 'AKTIF' : 'NONAKTIF') + '.';
    } else {
      status.textContent = 'Belum ada API key. Isi API key lalu simpan agar Live Chat AI bisa diaktifkan.';
    }
    $('aktif').disabled = !d.ada_key;
  }

  // Aktifkan saklar begitu admin mengetik API key baru
  $('apiKey').addEventListener('input', function () {
    $('aktif').disabled = false;
  });

  $('formAdmin').addEventListener('submit', async function (e) {
    e.preventDefault();
    const msg = $('adminMsg');
    $('hasilTes').hidden = true;
    try {
      const d = await App.api('/api/admin/chatbot', 'PUT', {
        aktif: $('aktif').checked,
        api_key: $('apiKey').value,
        hapus_key: $('hapusKey').checked,
        base_url: $('baseUrl').value,
        model: $('model').value,
        temperature: $('temperature').value,
        max_tokens: $('maxTokens').value,
        system_prompt: $('prompt').value
      });
      isiForm(d);
      App.tampilPesan(msg, 'Pengaturan tersimpan.', true);
    } catch (err) {
      App.tampilPesan(msg, err.message, false);
    }
  });

  $('btnBawaan').addEventListener('click', function () {
    $('prompt').value = promptBawaan;
  });

  // Tes memakai pengaturan yang SUDAH TERSIMPAN (simpan dulu jika baru mengubah)
  $('btnTes').addEventListener('click', async function () {
    const tombol = $('btnTes');
    const hasil = $('hasilTes');
    tombol.disabled = true;
    hasil.hidden = false;
    hasil.className = 'hasil-tes';
    hasil.textContent = 'Menghubungi layanan AI...';
    try {
      const d = await App.api('/api/admin/chatbot/test', 'POST');
      hasil.className = 'hasil-tes ok';
      hasil.textContent = 'Berhasil (' + d.token.total + ' token terpakai). Balasan AI: ' + d.balasan;
    } catch (err) {
      hasil.className = 'hasil-tes gagal';
      hasil.textContent = err.message;
    }
    tombol.disabled = false;
  });

  // ---------- Mulai: cek admin ----------
  App.ready.then(async function (user) {
    if (!user) {
      $('tolak').hidden = false;
      $('tolakPesan').textContent = 'Silakan masuk dengan akun admin.';
      return;
    }
    if (user.role !== 'admin') {
      $('tolak').hidden = false;
      $('tolakMasuk').hidden = true;
      $('tolakPesan').textContent = 'Akunmu bukan admin. Halaman ini khusus admin.';
      return;
    }
    try {
      isiForm(await App.api('/api/admin/chatbot'));
      await muatRingkasan();
      $('areaAdmin').hidden = false;
    } catch (err) {
      $('tolak').hidden = false;
      $('tolakPesan').textContent = err.message;
    }
  });
})();
