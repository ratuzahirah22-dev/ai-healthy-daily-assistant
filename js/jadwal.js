/* ==========================================================================
   Halaman Jadwal Hari Ini — pengingat & jadwal kegiatan pengguna
   - Tamu (belum login): hanya melihat ajakan masuk
   - Pengguna login: jadwal tersimpan di database MySQL
   ========================================================================== */
(function () {
  'use strict';

  const $ = function (id) { return document.getElementById(id); };

  // Warna chip kategori
  const KAT_CLASS = {
    'Umum': 'k-gray',
    'Kesehatan': '',
    'Olahraga': 'k-orange',
    'Makan': 'k-blue',
    'Obat': 'k-pink',
    'Istirahat': 'k-purple',
    'Kerja': 'k-teal'
  };
  function kelasKat(k) { return Object.prototype.hasOwnProperty.call(KAT_CLASS, k) ? KAT_CLASS[k] : 'k-gray'; }

  let daftarHariIni = [];
  let intervalPengingat = null;
  const sudahDibunyikan = {}; // key: "<id>:<jam>" agar notifikasi tidak dobel di menit yang sama

  function rapikanWaktu(w) { return String(w || '').slice(0, 5); }
  function jamSekarang() {
    const d = new Date();
    return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  }
  function tanggalPanjang(d) {
    return d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }

  // ---------- Ringkasan atas ----------
  function renderRingkasan() {
    const total = daftarHariIni.length;
    const selesai = daftarHariIni.filter(function (j) { return j.selesai; }).length;
    $('rTotal').textContent = total;
    $('rSelesai').textContent = selesai;
    $('rBelum').textContent = total - selesai;

    const now = jamSekarang();
    const berikut = daftarHariIni.filter(function (j) { return !j.selesai && rapikanWaktu(j.waktu) >= now; })[0]
      || daftarHariIni.filter(function (j) { return !j.selesai; })[0];
    $('rBerikut').textContent = berikut ? rapikanWaktu(berikut.waktu) : '—';
  }

  function ulangiTeks(j) {
    if (j.ulangi === 'harian') return 'Setiap hari';
    if (j.ulangi === 'mingguan') {
      const nama = ['', 'Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
      return 'Setiap ' + (nama[j.hari] || 'minggu');
    }
    return 'Sekali' + (j.tanggal ? ' · ' + new Date(j.tanggal + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : '');
  }

  // ---------- Daftar jadwal hari ini (timeline) ----------
  function renderDaftar() {
    const ul = $('daftarJadwal');
    if (!daftarHariIni.length) {
      ul.innerHTML = '<li class="jadwal-kosong">Belum ada jadwal untuk hari ini. Tambahkan lewat panel "Tambah Jadwal".</li>';
      return;
    }
    ul.innerHTML = daftarHariIni.map(function (j) {
      return '<li class="jadwal-item' + (j.selesai ? ' selesai' : '') + '">' +
        '<input type="checkbox" class="jadwal-cek"' + (j.selesai ? ' checked' : '') + ' data-cek="' + j.id + '" aria-label="Tandai selesai">' +
        '<div class="jadwal-isi">' +
          '<div><span class="jadwal-waktu">' + rapikanWaktu(j.waktu) + '</span> · ' +
            '<span class="jadwal-judul">' + App.esc(j.judul) + '</span></div>' +
          (j.catatan ? '<div class="jadwal-catatan">' + App.esc(j.catatan) + '</div>' : '') +
          '<div class="jadwal-meta">' +
            '<span class="chip-kat ' + kelasKat(j.kategori) + '">' + App.esc(j.kategori) + '</span>' +
            '<span style="font-size:0.78rem;color:var(--text-light)">' + App.esc(ulangiTeks(j)) + '</span>' +
          '</div>' +
        '</div>' +
        '<button class="jadwal-hapus" data-hapus="' + j.id + '" title="Hapus jadwal" aria-label="Hapus jadwal"><i class="fas fa-trash"></i></button>' +
      '</li>';
    }).join('');
  }

  // ---------- Jadwal mendatang ----------
  function renderMendatang(list) {
    const panel = $('panelMendatang');
    if (!list.length) { panel.hidden = true; return; }
    panel.hidden = false;
    $('mendatangBody').innerHTML = list.map(function (m) {
      const tgl = new Date(m.tanggal + 'T00:00:00').toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
      return '<tr><td>' + App.esc(tgl) + '</td><td>' + rapikanWaktu(m.waktu) + '</td>' +
        '<td><strong>' + App.esc(m.judul) + '</strong>' +
        (m.catatan ? '<br><small style="color:var(--text-light)">' + App.esc(m.catatan) + '</small>' : '') + '</td>' +
        '<td><span class="chip-kat ' + kelasKat(m.kategori) + '">' + App.esc(m.kategori) + '</span></td>' +
        '<td><button class="jadwal-hapus" data-hapus="' + m.id + '" title="Hapus jadwal" aria-label="Hapus jadwal"><i class="fas fa-trash"></i></button></td></tr>';
    }).join('');
  }

  async function muat() {
    const d = await App.api('/api/jadwal');
    // Urutkan berdasarkan jam (server juga sudah mengurutkan)
    daftarHariIni = (d.hari_ini || []).slice().sort(function (a, b) {
      return rapikanWaktu(a.waktu).localeCompare(rapikanWaktu(b.waktu));
    });
    $('hariLabel').textContent = tanggalPanjang(new Date());
    renderRingkasan();
    renderDaftar();
    renderMendatang(d.mendatang || []);
  }

  // ---------- Form: tampilkan field sesuai pilihan "Ulangi" ----------
  $('jUlangi').addEventListener('change', function () {
    $('grupTanggal').hidden = this.value !== 'sekali';
    $('grupHari').hidden = this.value !== 'mingguan';
  });

  $('formJadwal').addEventListener('submit', async function (e) {
    e.preventDefault();
    const msg = $('jadwalMsg');
    const ulangi = $('jUlangi').value;
    const body = {
      judul: $('jJudul').value.trim(),
      waktu: $('jWaktu').value,
      kategori: $('jKategori').value,
      catatan: $('jCatatan').value.trim(),
      ulangi: ulangi
    };
    if (!body.judul) return App.tampilPesan(msg, 'Nama kegiatan wajib diisi.', false);
    if (!body.waktu) return App.tampilPesan(msg, 'Waktu wajib diisi.', false);
    if (ulangi === 'sekali') {
      if (!$('jTanggal').value) return App.tampilPesan(msg, 'Pilih tanggal untuk jadwal sekali.', false);
      body.tanggal = $('jTanggal').value;
    }
    if (ulangi === 'mingguan') body.hari = Number($('jHari').value);

    try {
      await App.api('/api/jadwal', 'POST', body);
      App.tampilPesan(msg, 'Jadwal disimpan.', true);
      $('jJudul').value = '';
      $('jCatatan').value = '';
      muat();
    } catch (err) {
      App.tampilPesan(msg, err.message, false);
    }
  });

  // ---------- Ceklis selesai & hapus (event delegation) ----------
  $('isiJadwal').addEventListener('click', async function (e) {
    const tombol = e.target.closest('[data-hapus]');
    if (!tombol) return;
    if (!confirm('Hapus jadwal ini?')) return;
    try {
      await App.api('/api/jadwal/' + tombol.getAttribute('data-hapus'), 'DELETE');
      muat();
    } catch (err) {
      alert(err.message);
    }
  });

  $('isiJadwal').addEventListener('change', async function (e) {
    const cek = e.target.closest('[data-cek]');
    if (!cek) return;
    cek.disabled = true;
    try {
      await App.api('/api/jadwal/' + cek.getAttribute('data-cek') + '/selesai', 'PUT', { selesai: cek.checked });
      const item = daftarHariIni.filter(function (j) { return String(j.id) === cek.getAttribute('data-cek'); })[0];
      if (item) item.selesai = cek.checked;
      const li = cek.closest('.jadwal-item');
      if (li) li.classList.toggle('selesai', cek.checked);
      renderRingkasan();
    } catch (err) {
      cek.checked = !cek.checked;
      alert(err.message);
    } finally {
      cek.disabled = false;
    }
  });

  // ---------- Pengingat (Notification browser) ----------
  function perbaruiInfoPengingat(aktif) {
    $('btnReminder').innerHTML = aktif
      ? '<i class="fas fa-bell-slash"></i> Matikan Pengingat'
      : '<i class="fas fa-bell"></i> Aktifkan Pengingat Jadwal';
    $('reminderInfo').innerHTML = aktif
      ? 'Pengingat <strong style="color:var(--primary)">aktif</strong> selama halaman ini terbuka.'
      : 'Pengingat <strong>nonaktif</strong>.';
  }

  function cekWaktu() {
    const now = jamSekarang();
    daftarHariIni.forEach(function (j) {
      if (j.selesai) return;
      if (rapikanWaktu(j.waktu) !== now) return;
      const kunci = j.id + ':' + now;
      if (sudahDibunyikan[kunci]) return;
      sudahDibunyikan[kunci] = true;
      if (window.Notification && Notification.permission === 'granted') {
        new Notification('Waktunya: ' + j.judul, { body: j.catatan || ('Jangan lupa ' + j.judul + ' sekarang.') });
      }
    });
  }

  $('btnReminder').addEventListener('click', async function () {
    const msg = $('reminderMsg');
    if (intervalPengingat) {
      clearInterval(intervalPengingat);
      intervalPengingat = null;
      localStorage.setItem('jadwalPengingat', '0');
      perbaruiInfoPengingat(false);
      App.tampilPesan(msg, 'Pengingat dimatikan.', true);
      return;
    }
    if (!('Notification' in window)) {
      return App.tampilPesan(msg, 'Browser ini tidak mendukung notifikasi.', false);
    }
    const izin = await Notification.requestPermission();
    if (izin !== 'granted') {
      return App.tampilPesan(msg, 'Izin notifikasi ditolak. Aktifkan lewat pengaturan situs.', false);
    }
    new Notification('Pengingat Jadwal aktif 🔔', { body: 'Kamu akan diingatkan saat jadwal waktunya tiba.' });
    intervalPengingat = setInterval(cekWaktu, 30000);
    localStorage.setItem('jadwalPengingat', '1');
    perbaruiInfoPengingat(true);
    cekWaktu();
    App.tampilPesan(msg, 'Pengingat aktif. Biarkan halaman ini terbuka.', true);
  });

  // ---------- Mulai: cek login ----------
  App.ready.then(async function (user) {
    if (!user) {
      $('loginWajib').hidden = false;
      return;
    }
    $('jadwalSub').textContent = 'Halo, ' + user.nama + '! Ini agenda kamu hari ini.';
    try {
      await muat();
    } catch (err) {
      $('jadwalSub').textContent = err.message;
    }

    // Lanjutkan pengingat bila sebelumnya sudah diaktifkan
    if (localStorage.getItem('jadwalPengingat') === '1' && window.Notification && Notification.permission === 'granted') {
      intervalPengingat = setInterval(cekWaktu, 30000);
      perbaruiInfoPengingat(true);
    }
    $('isiJadwal').hidden = false;
  });
})();
