/* ==========================================================================
   Halaman Kesehatan — dashboard, BMI, kebiasaan, dan riwayat yang dinamis
   - Pengunjung (belum login): hanya melihat ajakan masuk (tidak ada angka contoh)
   - Pengguna login: data diambil & disimpan ke database MySQL
   ========================================================================== */
(function () {
  'use strict';

  const $ = function (id) { return document.getElementById(id); };
  const angka = function (n) { return Number(n).toLocaleString('id-ID'); };

  // ---------- Hitung BMI (rumus sama dengan di server) ----------
  function hitungBmi(tinggiCm, beratKg) {
    const m = tinggiCm / 100;
    const bmi = Math.round((beratKg / (m * m)) * 10) / 10;
    if (bmi < 18.5) return { bmi: bmi, kategori: 'Berat Kurang', warna: '#3b82f6', badge: 'Kurang' };
    if (bmi < 25) return { bmi: bmi, kategori: 'Berat Ideal', warna: '#10b981', badge: '+ Ideal' };
    if (bmi < 30) return { bmi: bmi, kategori: 'Berat Berlebih', warna: '#f59e0b', badge: 'Berlebih' };
    return { bmi: bmi, kategori: 'Obesitas', warna: '#ef4444', badge: 'Obesitas' };
  }

  // ---------- Isi satu kartu dashboard ----------
  function isiKartu(id, d) {
    const kartu = $(id);
    kartu.querySelector('.dash-badge').textContent = d.badge;
    kartu.querySelector('.dash-value').innerHTML = d.nilai + ' <small>' + d.satuan + '</small>';
    kartu.querySelector('.progress-fill').style.setProperty('--w', Math.min(100, Math.max(0, d.persen)) + '%');
    kartu.querySelector('.dash-note').textContent = d.catatan;
  }

  function persen(nilai, target) { return Math.round((nilai / target) * 100); }

  function tampilkanDashboard(data) {
    const h = data.hari_ini || { air_gelas: 0, langkah: 0, tidur_jam: 0, kalori: 0, detak_jantung: 0 };
    // Target menyesuaikan umur & jenis kelamin (dihitung di server: kebutuhan.js)
    const t = data.target || { air_gelas: 8, langkah: 10000, kalori: 2000, tidur_min: 7, tidur_max: 9, catatan: '' };

    // Keterangan target di bawah judul
    const ti = $('targetInfo');
    if (ti) {
      ti.innerHTML = '<i class="fas fa-bullseye"></i> ' + App.esc(t.catatan || '');
      ti.classList.toggle('kurang-data', t.lengkap === false);
    }

    // BMI: pakai catatan terakhir
    if (data.bmi) {
      const b = hitungBmi(data.bmi.tinggi_cm, data.bmi.berat_kg);
      isiKartu('card-bmi', {
        badge: b.badge, nilai: b.bmi, satuan: 'BMI', persen: persen(b.bmi, 40),
        catatan: b.kategori + '. ' + (b.kategori === 'Berat Ideal' ? 'Pertahankan pola makan seimbang.' : 'Atur pola makan & olahraga ya.')
      });
      tampilkanHasilBmi(b);
    } else {
      isiKartu('card-bmi', { badge: 'Belum ada', nilai: '—', satuan: 'BMI', persen: 0, catatan: 'Hitung BMI-mu di kalkulator di bawah.' });
    }

    // Air (1 gelas = 250 ml; target sesuai umur & jenis kelamin)
    const liter = (h.air_gelas * 0.25).toLocaleString('id-ID');
    const literTarget = (t.air_gelas * 0.25).toLocaleString('id-ID');
    isiKartu('card-air', {
      badge: h.air_gelas + ' / ' + t.air_gelas + ' gelas', nilai: liter, satuan: 'Liter', persen: persen(h.air_gelas, t.air_gelas),
      catatan: h.air_gelas >= t.air_gelas
        ? 'Target ' + literTarget + ' liter tercapai. Hebat!'
        : 'Kurang ' + (t.air_gelas - h.air_gelas) + ' gelas lagi menuju target ' + literTarget + ' liter.'
    });

    // Langkah (target sesuai umur)
    isiKartu('card-langkah', {
      badge: h.langkah >= t.langkah ? 'Target tercapai' : (h.langkah >= t.langkah / 2 ? 'Aktif' : 'Ayo bergerak'),
      nilai: angka(h.langkah), satuan: 'langkah', persen: persen(h.langkah, t.langkah),
      catatan: h.langkah >= t.langkah
        ? 'Mantap, target ' + angka(t.langkah) + ' langkah tercapai!'
        : 'Target ' + angka(t.langkah) + ' langkah untuk umurmu. Ayo jalan santai hari ini!'
    });

    // Tidur (rentang ideal sesuai umur)
    const tidurOk = h.tidur_jam >= t.tidur_min && h.tidur_jam <= t.tidur_max;
    isiKartu('card-tidur', {
      badge: h.tidur_jam === 0 ? 'Belum diisi' : (h.tidur_jam < t.tidur_min ? 'Kurang' : (tidurOk ? 'Cukup' : 'Berlebih')),
      nilai: h.tidur_jam.toLocaleString('id-ID'), satuan: 'jam', persen: persen(h.tidur_jam, t.tidur_max),
      catatan: tidurOk
        ? 'Tidur nyenyak. Idealnya ' + t.tidur_min + '-' + t.tidur_max + ' jam untuk umurmu.'
        : 'Idealnya tidur ' + t.tidur_min + '-' + t.tidur_max + ' jam per malam.'
    });

    // Kalori terbakar (TDEE sesuai umur, jenis kelamin, tinggi, berat)
    isiKartu('card-kalori', {
      badge: h.kalori === 0 ? 'Belum diisi' : angka(h.kalori) + ' kcal', nilai: angka(h.kalori), satuan: 'kcal', persen: persen(h.kalori, t.kalori),
      catatan: 'Kebutuhan sekitar ' + angka(t.kalori) + ' kcal' + (t.lengkap ? ' sesuai profilmu' : ' (acuan umum)') + '.'
    });

    // Detak jantung (normal istirahat 60–100 bpm)
    const d = h.detak_jantung;
    isiKartu('card-detak', {
      badge: d === 0 ? 'Belum diisi' : (d < 60 ? 'Rendah' : (d <= 100 ? 'Normal' : 'Tinggi')),
      nilai: d === 0 ? '—' : d, satuan: 'bpm', persen: persen(d, 150),
      catatan: 'Detak istirahat normal (60–100 bpm).'
    });
  }

  // ---------- Hasil BMI di panel kalkulator ----------
  function tampilkanHasilBmi(b) {
    $('bmiAngka').textContent = b.bmi;
    $('bmiStatus').textContent = b.kategori;
    $('bmiStatus').style.background = b.warna;
  }

  // ---------- Daftar kebiasaan (ceklis) ----------
  // Rule: habit bernama apa yang wajib data hari ini diisi dulu
  const syaratHabit = function (nama, h) {
    const n = (nama || '').toLowerCase();
    if (n.indexOf('minum 8 gelas') >= 0) return h && h.air_gelas >= 8;
    if (n.indexOf('olahraga') >= 0) return h && h.kalori >= 150;
    if (n.indexOf('jalan kaki') >= 0) return h && h.langkah >= 5000;
    if (n.indexOf('tidur') >= 0) return h && h.tidur_jam >= 1;
    return true; // makan sayur, meditasi, tanpa soda: boleh dicentang manual
  };

  function tampilkanKebiasaan(daftar, dataHariIni) {
    const ul = $('habitList');
    ul.innerHTML = '';

    // Sinkronkan dulu: habit yang sudah dicentang tapi data hari ini tidak memenuhi syarat, otomatis di-batal-centang
    daftar.forEach(function (k) {
      if (k.selesai && !syaratHabit(k.nama, dataHariIni)) {
        k.selesai = false;
        App.api('/api/habits/' + k.id, 'PUT', { selesai: false }).catch(function () {});
      }
    });

    daftar.forEach(function (k) {
      const boleh = syaratHabit(k.nama, dataHariIni);
      const li = document.createElement('li');
      li.innerHTML = '<input type="checkbox" id="habit' + k.id + '"' +
        (k.selesai ? ' checked' : '') + (boleh ? '' : ' disabled') + '>' +
        '<span>' + App.esc(k.nama) + (boleh ? '' :
          ' <small style="color:var(--text-light)">(isi data hari ini dulu)</small>') + '</span>';
      li.querySelector('input').addEventListener('change', async function (e) {
        const centang = e.target.checked;
        try {
          await App.api('/api/habits/' + k.id, 'PUT', { selesai: centang });
          k.selesai = centang;
          hitungSkor(daftar);
        } catch (err) {
          e.target.checked = !centang; // gagal menyimpan: kembalikan centang
          alert(err.message);
        }
      });
      ul.appendChild(li);
    });
    hitungSkor(daftar);
  }

  function hitungSkor(daftar) {
    const selesai = daftar.filter(function (k) { return k.selesai; }).length;
    const pesan = selesai === daftar.length ? 'Luar biasa, semua selesai!' : 'Terus tingkatkan!';
    $('habitScore').innerHTML = 'Skor kebiasaanmu hari ini: <strong>' + selesai + ' / ' + daftar.length + '</strong> — ' + pesan;
    // Ringkasan status kebiasaan juga muncul di panel Pengingat
    const rd = $('reminderDesc');
    if (rd) rd.textContent = 'Checklist hari ini tersambung ke data yang kamu input. Beberapa kebiasaan hanya bisa dicentang setelah datanya diisi.';
    const rs = $('reminderScore');
    if (rs) {
      rs.innerHTML = selesai === daftar.length
        ? '<strong>' + selesai + ' / ' + daftar.length + '</strong> kebiasaan selesai hari ini. Luar biasa!'
        : '<strong>' + selesai + ' / ' + daftar.length + '</strong> kebiasaan selesai hari ini. Aktivasi pengingat agar kamu tidak lupa lengkapi semuanya.';
    }
  }

  // ---------- Catat makanan (tabel gizi lokal, tanpa AI) ----------
  let daftarMakanan = [];

  // ---- Combobox makanan: ketik untuk mencari, klik untuk memilih ----
  let indeksAktif = -1; // item yang sedang disorot lewat tombol panah

  function makananTerpilih() {
    const id = $('pilihMakanan') ? $('pilihMakanan').value : '';
    return daftarMakanan.filter(function (x) { return String(x.id) === String(id); })[0] || null;
  }

  function tutupCombo() {
    const list = $('comboList');
    const input = $('cariMakanan');
    if (list) list.hidden = true;
    if (input) input.setAttribute('aria-expanded', 'false');
    indeksAktif = -1;
  }

  // Isi & tampilkan daftar makanan sesuai kata kunci (dikelompokkan per kategori)
  function bukaCombo() {
    const input = $('cariMakanan');
    const list = $('comboList');
    if (!input || !list || !daftarMakanan.length) return;

    const kata = input.value.trim().toLowerCase();
    const hasil = daftarMakanan.filter(function (m) {
      return !kata || m.nama.toLowerCase().indexOf(kata) >= 0 || m.kategori.toLowerCase().indexOf(kata) >= 0;
    });

    if (!hasil.length) {
      list.innerHTML = '<li class="combo-kosong">Tidak ada makanan yang cocok.</li>';
    } else {
      const kategori = [];
      hasil.forEach(function (m) { if (kategori.indexOf(m.kategori) < 0) kategori.push(m.kategori); });
      list.innerHTML = kategori.map(function (k) {
        const isi = hasil.filter(function (m) { return m.kategori === k; }).map(function (m) {
          return '<li class="combo-item" role="option" data-id="' + m.id + '">' +
            '<span class="combo-nama">' + App.esc(m.nama) + '</span>' +
            '<span class="combo-kcal">' + m.kcal_per_100g + ' kcal/100 g</span></li>';
        }).join('');
        return '<li class="combo-kategori">' + App.esc(k) + '</li>' + isi;
      }).join('');
    }
    list.hidden = false;
    input.setAttribute('aria-expanded', 'true');
    indeksAktif = -1;
  }

  function pilihDariCombo(id) {
    const m = daftarMakanan.filter(function (x) { return String(x.id) === String(id); })[0];
    if (!m) return;
    $('pilihMakanan').value = m.id;
    $('cariMakanan').value = m.nama;
    // Berat otomatis mengikuti porsi lazim makanan (tidak bisa diubah manual)
    $('jumlahGram').value = m.gram_porsi || 100;
    $('infoMakanan').textContent = 'Porsi lazim: ' + m.takaran + ' · energi ' + m.kcal_per_100g + ' kcal/100 g';
    tutupCombo();
  }

  // Sorot item saat navigasi keyboard
  function sorotItem() {
    const list = $('comboList');
    if (!list) return;
    const item = list.querySelectorAll('.combo-item');
    if (!item.length) return;
    if (indeksAktif < 0) indeksAktif = 0;
    if (indeksAktif >= item.length) indeksAktif = item.length - 1;
    item.forEach(function (el, i) { el.classList.toggle('aktif', i === indeksAktif); });
    item[indeksAktif].scrollIntoView({ block: 'nearest' });
  }

  function tampilkanMakanan(daftar, total, targetKalori) {
    const acuan = targetKalori || 2000;
    const tbody = $('makanBody');
    tbody.innerHTML = daftar.length
      ? daftar.map(function (m) {
          return '<tr><td><strong>' + App.esc(m.nama) + '</strong><br><small style="color:var(--text-light)">' + App.esc(m.takaran || '') + '</small></td>' +
            '<td>' + angka(m.jumlah_gram) + ' g</td>' +
            '<td>' + angka(m.kcal) + ' kcal</td>' +
            '<td><button class="btn btn-kecil btn-secondary" data-hapus="' + m.id + '"><i class="fas fa-trash"></i> Hapus</button></td></tr>';
        }).join('')
      : '<tr><td colspan="4" class="kosong">Belum ada makanan dicatat hari ini.</td></tr>';

    $('totalMakan').innerHTML = 'Total energi masuk hari ini: <strong>' + angka(total) + ' kcal</strong>';

    // Kartu dashboard "Kalori Masuk" (acuan = kebutuhan kalori sesuai profil)
    isiKartu('card-makan', {
      badge: angka(total) + ' kcal',
      nilai: angka(total),
      satuan: 'kcal',
      persen: persen(total, acuan),
      catatan: total === 0
        ? 'Belum ada makanan yang dicatat hari ini.'
        : (total > acuan
            ? 'Melebihi acuan ' + angka(acuan) + ' kcal. Kurangi porsi gula & lemak.'
            : 'Masih di bawah acuan ' + angka(acuan) + ' kcal per hari.')
    });
  }

  async function muatMakanan() {
    const d = await App.api('/api/makanan');
    daftarMakanan = d.makanan;
  }

  const formMakan = $('formMakan');
  if (formMakan) {
    const inputCari = $('cariMakanan');
    const comboList = $('comboList');

    if (inputCari && comboList) {
      // Klik / fokus pada kolom -> tampilkan seluruh daftar
      inputCari.addEventListener('focus', bukaCombo);
      inputCari.addEventListener('click', bukaCombo);

      // Mengetik -> saring daftar. Bila teks diubah, pilihan sebelumnya dibatalkan.
      inputCari.addEventListener('input', function () {
        const m = makananTerpilih();
        if (!m || m.nama.toLowerCase() !== inputCari.value.trim().toLowerCase()) {
          $('pilihMakanan').value = '';
          $('jumlahGram').value = ''; // berat juga direset sampai makanan dipilih
          $('infoMakanan').textContent = 'Berat mengikuti porsi lazim makanan yang kamu pilih.';
        }
        bukaCombo();
      });

      // Navigasi keyboard: panah atas/bawah, Enter memilih, Esc menutup
      inputCari.addEventListener('keydown', function (e) {
        const terbuka = !comboList.hidden;
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          if (!terbuka) return bukaCombo();
          indeksAktif++;
          sorotItem();
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          if (!terbuka) return;
          if (indeksAktif > 0) indeksAktif--;
          sorotItem();
        } else if (e.key === 'Enter') {
          e.preventDefault();
          const item = comboList.querySelectorAll('.combo-item');
          if (terbuka && item.length) {
            const target = item[Math.max(0, indeksAktif)];
            pilihDariCombo(target.getAttribute('data-id'));
          }
        } else if (e.key === 'Escape') {
          tutupCombo();
        }
      });

      // Klik item di daftar
      comboList.addEventListener('mousedown', function (e) {
        const item = e.target.closest('.combo-item');
        if (!item) return;
        e.preventDefault(); // jangan sampai kolom kehilangan fokus sebelum diproses
        pilihDariCombo(item.getAttribute('data-id'));
      });

      // Klik di luar area combobox -> tutup
      document.addEventListener('click', function (e) {
        const combo = document.getElementById('comboMakan');
        if (combo && !combo.contains(e.target)) tutupCombo();
      });
    }

    formMakan.addEventListener('submit', async function (e) {
      e.preventDefault();
      const msg = $('makanMsg');
      // Bila pengguna mengetik nama persis tapi belum klik, cocokkan otomatis
      let id = $('pilihMakanan').value;
      if (!id) {
        const teks = inputCari ? inputCari.value.trim().toLowerCase() : '';
        const tepat = daftarMakanan.filter(function (m) { return m.nama.toLowerCase() === teks; })[0];
        if (tepat) id = tepat.id;
      }
      const gram = Number($('jumlahGram').value);
      if (!id) return App.tampilPesan(msg, 'Pilih makanan dulu.', false);
      if (!(gram >= 1 && gram <= 2000)) return App.tampilPesan(msg, 'Berat harus antara 1–2.000 gram.', false);
      try {
        const r = await App.api('/api/makanan', 'POST', { makanan_id: Number(id), jumlah_gram: gram });
        App.tampilPesan(msg, r.pesan + ' (' + r.kcal + ' kcal)', true);
        muatDashboard();
      } catch (err) {
        App.tampilPesan(msg, err.message, false);
      }
    });

    $('makanBody').addEventListener('click', async function (e) {
      const btn = e.target.closest('[data-hapus]');
      if (!btn) return;
      try {
        await App.api('/api/makanan/' + btn.getAttribute('data-hapus'), 'DELETE');
        $('makanMsg').textContent = 'Catatan makanan dihapus.';
        muatDashboard();
      } catch (err) {
        App.tampilPesan($('makanMsg'), err.message, false);
      }
    });
  }

  // ---------- Riwayat 7 hari ----------
  function tampilkanRiwayat(daftar) {
    const tbody = $('riwayatBody');
    if (!daftar.length) {
      tbody.innerHTML = '<tr><td colspan="6" class="kosong">Belum ada catatan. Isi data hari ini di atas.</td></tr>';
      return;
    }
    tbody.innerHTML = daftar.map(function (r) {
      const tgl = new Date(r.tanggal + 'T00:00:00').toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short' });
      return '<tr><td><strong>' + App.esc(tgl) + '</strong></td><td>' + r.air_gelas + ' gelas</td><td>' + angka(r.langkah) +
        '</td><td>' + r.tidur_jam + ' jam</td><td>' + angka(r.kalori) + ' kcal</td><td>' + (r.detak_jantung || '—') + '</td></tr>';
    }).join('');
  }

  // ---------- Isi form "Catat Data Hari Ini" dari data tersimpan ----------
  function isiForm(h) {
    if (!h) return;
    $('inAir').value = h.air_gelas;
    $('inLangkah').value = h.langkah;
    $('inTidur').value = h.tidur_jam;
    $('inKalori').value = h.kalori;
    $('inDetak').value = h.detak_jantung || '';
  }

  // ---------- Grafik perkembangan (Chart.js) ----------
  let grafik = null;
  function tampilkanGrafik(riwayat) {
    const ctx = document.getElementById('grafikKesehatan');
    if (!ctx || typeof Chart === 'undefined') return;
    const data = riwayat.slice().reverse(); // terlama -> terbaru
    if (grafik) grafik.destroy();
    grafik = new Chart(ctx, {
      type: 'line',
      data: {
        labels: data.map(function (r) { return new Date(r.tanggal + 'T00:00:00').toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric' }); }),
        datasets: [
          { label: 'Langkah', data: data.map(function (r) { return r.langkah; }), borderColor: '#f59e0b', backgroundColor: 'rgba(245,158,11,0.15)', tension: 0.3, fill: true, yAxisID: 'y' },
          { label: 'Tidur (jam)', data: data.map(function (r) { return r.tidur_jam; }), borderColor: '#8b5cf6', backgroundColor: 'rgba(139,92,246,0.15)', tension: 0.3, fill: true, yAxisID: 'y1' },
          { label: 'Kalori (kcal)', data: data.map(function (r) { return r.kalori; }), borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.15)', tension: 0.3, fill: true, yAxisID: 'y' }
        ]
      },
      options: {
        responsive: true,
        interaction: { mode: 'index', intersect: false },
        scales: { y: { beginAtZero: true }, y1: { beginAtZero: true, position: 'right', grid: { drawOnChartArea: false } } }
      }
    });
  }

  // ---------- Pengingat minum air ----------
  let intervalPengingat = null;
  const btnP = document.getElementById('btnPengingat');
  if (btnP) {
    btnP.addEventListener('click', async function () {
      const msg = document.getElementById('pengingatMsg');
      if (intervalPengingat) {
        clearInterval(intervalPengingat); intervalPengingat = null;
        btnP.innerHTML = '<i class="fas fa-glass-water"></i> Aktifkan Pengingat Minum';
        msg.textContent = 'Pengingat dimatikan.';
        return;
      }
      const izin = await Notification.requestPermission();
      if (izin !== 'granted') { msg.textContent = 'Izin notifikasi ditolak browser. Aktifkan di pengaturan situs.'; return; }
      new Notification('Pengingat Minum 💧', { body: 'Jangan lupa minum segelas air!' });
      intervalPengingat = setInterval(function () {
        new Notification('Pengingat Minum 💧', { body: 'Waktunya minum air agar tubuh tetap segar!' });
      }, 60 * 60 * 1000); // tiap 1 jam
      btnP.innerHTML = '<i class="fas fa-bell-slash"></i> Matikan Pengingat';
      msg.textContent = 'Pengingat aktif: kamu akan diingatkan minum air tiap 1 jam.';
    });
  }

  // ---------- Ekspor laporan PDF ----------
  const btnE = document.getElementById('btnExport');
  if (btnE) btnE.addEventListener('click', function () { window.print(); });

  async function muatDashboard() {
    const data = await App.api('/api/dashboard');
    tampilkanDashboard(data);
    tampilkanKebiasaan(data.kebiasaan, data.hari_ini);
    tampilkanRiwayat(data.riwayat);
    tampilkanGrafik(data.riwayat);
    tampilkanMakanan(data.makanan || [], data.total_kalori_masuk || 0, data.target && data.target.kalori);
    isiForm(data.hari_ini);
    if (data.profil.tinggi_cm) $('bmiTinggi').value = data.profil.tinggi_cm;
    if (data.profil.berat_kg) $('bmiBerat').value = data.profil.berat_kg;
  }

  // ---------- Kalkulator BMI ----------
  $('btnBmi').addEventListener('click', async function () {
    const msg = $('bmiMsg');
    const tinggi = Number($('bmiTinggi').value);
    const berat = Number($('bmiBerat').value);
    if (!(tinggi >= 50 && tinggi <= 250) || !(berat >= 10 && berat <= 300)) {
      App.tampilPesan(msg, 'Isi tinggi 50–250 cm dan berat 10–300 kg dengan benar.', false);
      return;
    }
    tampilkanHasilBmi(hitungBmi(tinggi, berat));

    try {
      await App.api('/api/bmi', 'POST', { tinggi_cm: tinggi, berat_kg: berat });
      App.tampilPesan(msg, 'Hasil BMI tersimpan.', true);
      muatDashboard();
    } catch (err) {
      App.tampilPesan(msg, err.message, false);
    }
  });

  // ---------- Simpan data harian ----------
  $('formHarian').addEventListener('submit', async function (e) {
    e.preventDefault();
    const msg = $('harianMsg');
    const data = {};
    new FormData(e.target).forEach(function (nilai, nama) { data[nama] = nilai; });
    try {
      await App.api('/api/health/today', 'PUT', data);
      App.tampilPesan(msg, 'Data hari ini tersimpan.', true);
      muatDashboard();
    } catch (err) {
      App.tampilPesan(msg, err.message, false);
    }
  });

  // ---------- Mulai: cek login ----------
  App.ready.then(async function (user) {
    if (!user) { // tamu: tampilkan ajakan masuk saja
      $('loginWajib').hidden = false;
      return;
    }
    $('dashSub').textContent = 'Halo, ' + user.nama + '! Ini data kesehatanmu hari ini.';
    $('habitSub').textContent = 'Centang kebiasaan sehat yang sudah kamu lakukan hari ini. Tersimpan otomatis.';
    try {
      await muatMakanan();
      await muatDashboard();
    } catch (err) {
      $('dashSub').textContent = err.message;
    }
    $('isiDashboard').hidden = false; // tampil setelah data dimuat (tanpa kedip angka contoh)
  });
})();
