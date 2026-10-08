// Data kesehatan: dashboard, catatan harian, BMI, dan ceklis kebiasaan
const express = require('express');
const db = require('../db');
const { wajibLogin, angka } = require('../middleware');
const { hitungTarget } = require('../kebutuhan');

const router = express.Router();

// Rumus BMI = berat (kg) / (tinggi (m) x tinggi (m))
function hitungBmi(tinggiCm, beratKg) {
  const m = tinggiCm / 100;
  const bmi = Math.round((beratKg / (m * m)) * 10) / 10;
  let kategori = 'Obesitas';
  if (bmi < 18.5) kategori = 'Berat Kurang';
  else if (bmi < 25) kategori = 'Berat Ideal';
  else if (bmi < 30) kategori = 'Berat Berlebih';
  return { bmi, kategori };
}

// GET /api/dashboard  -> semua data yang dibutuhkan halaman Kesehatan
router.get('/dashboard', wajibLogin, async (req, res) => {
  const uid = req.userId;

  const [[user]] = await db.query('SELECT tinggi_cm, berat_kg, jenis_kelamin, tanggal_lahir FROM users WHERE id = ?', [uid]);
  const [hariIni] = await db.query(
    'SELECT air_gelas, langkah, tidur_jam, kalori, detak_jantung FROM health_logs WHERE user_id = ? AND tanggal = CURDATE()',
    [uid]
  );
  const [kebiasaan] = await db.query(
    `SELECT h.id, h.nama, (hl.habit_id IS NOT NULL) AS selesai
       FROM habits h
       LEFT JOIN habit_logs hl ON hl.habit_id = h.id AND hl.user_id = ? AND hl.tanggal = CURDATE()
      ORDER BY h.id`,
    [uid]
  );
  const [bmiTerakhir] = await db.query(
    'SELECT tinggi_cm, berat_kg, bmi, kategori FROM bmi_records WHERE user_id = ? ORDER BY id DESC LIMIT 1',
    [uid]
  );
  const [riwayat] = await db.query(
    `SELECT tanggal, air_gelas, langkah, tidur_jam, kalori, detak_jantung
       FROM health_logs
      WHERE user_id = ? AND tanggal >= CURDATE() - INTERVAL 6 DAY
      ORDER BY tanggal DESC`,
    [uid]
  );
  // Catatan makanan hari ini (dari tabel makanan lokal, tanpa AI)
  const [makananHariIni] = await db.query(
    `SELECT fl.id, fl.jumlah_gram, f.nama, f.kategori, f.takaran, f.kcal_per_100g,
            ROUND(f.kcal_per_100g * fl.jumlah_gram / 100) AS kcal
       FROM food_logs fl
       JOIN foods f ON f.id = fl.makanan_id
      WHERE fl.user_id = ? AND fl.tanggal = CURDATE()
      ORDER BY fl.id DESC`,
    [uid]
  );

  const profil = {
    tinggi_cm: user.tinggi_cm === null ? null : Number(user.tinggi_cm),
    berat_kg: user.berat_kg === null ? null : Number(user.berat_kg),
    jenis_kelamin: user.jenis_kelamin || null,
    tanggal_lahir: user.tanggal_lahir || null
  };
  const target = hitungTarget(profil);

  res.json({
    profil: Object.assign({}, profil, { umur: target.umur }),
    target: target,
    hari_ini: hariIni[0] ? {
      air_gelas: hariIni[0].air_gelas,
      langkah: hariIni[0].langkah,
      tidur_jam: Number(hariIni[0].tidur_jam),
      kalori: hariIni[0].kalori,
      detak_jantung: hariIni[0].detak_jantung
    } : null,
    kebiasaan: kebiasaan.map(function (k) { return { id: k.id, nama: k.nama, selesai: !!k.selesai }; }),
    bmi: bmiTerakhir[0] ? {
      tinggi_cm: Number(bmiTerakhir[0].tinggi_cm),
      berat_kg: Number(bmiTerakhir[0].berat_kg),
      bmi: Number(bmiTerakhir[0].bmi),
      kategori: bmiTerakhir[0].kategori
    } : null,
    riwayat: riwayat.map(function (r) { return Object.assign({}, r, { tidur_jam: Number(r.tidur_jam) }); }),
    makanan: makananHariIni.map(function (m) {
      return {
        id: m.id, nama: m.nama, kategori: m.kategori, takaran: m.takaran,
        jumlah_gram: Number(m.jumlah_gram), kcal: Number(m.kcal),
        kcal_per_100g: Number(m.kcal_per_100g)
      };
    }),
    total_kalori_masuk: makananHariIni.reduce(function (t, m) { return t + Number(m.kcal); }, 0)
  });
});

// PUT /api/health/today  -> simpan / perbarui catatan hari ini
router.put('/health/today', wajibLogin, async (req, res) => {
  const b = req.body;
  const air = angka(b.air_gelas, 0, 30);
  const langkah = angka(b.langkah, 0, 100000);
  const tidur = angka(b.tidur_jam, 0, 24);
  const kalori = angka(b.kalori, 0, 20000);
  const detak = angka(b.detak_jantung, 0, 250);

  if (Number.isNaN(air)) return res.status(400).json({ pesan: 'Gelas air harus 0–30.' });
  if (Number.isNaN(langkah)) return res.status(400).json({ pesan: 'Langkah harus 0–100.000.' });
  if (Number.isNaN(tidur)) return res.status(400).json({ pesan: 'Jam tidur harus 0–24.' });
  if (Number.isNaN(kalori)) return res.status(400).json({ pesan: 'Kalori harus 0–20.000.' });
  if (Number.isNaN(detak)) return res.status(400).json({ pesan: 'Detak jantung harus 0–250 bpm.' });

  // Kolom kosong disimpan sebagai 0. Jika baris hari ini sudah ada, nilainya diperbarui.
  await db.query(
    `INSERT INTO health_logs (user_id, tanggal, air_gelas, langkah, tidur_jam, kalori, detak_jantung)
     VALUES (?, CURDATE(), ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE air_gelas = VALUES(air_gelas), langkah = VALUES(langkah),
       tidur_jam = VALUES(tidur_jam), kalori = VALUES(kalori), detak_jantung = VALUES(detak_jantung)`,
    [req.userId, air || 0, langkah || 0, tidur || 0, kalori || 0, detak || 0]
  );
  res.json({ pesan: 'Data hari ini tersimpan.' });
});

// POST /api/bmi  -> hitung & simpan BMI, perbarui profil tinggi/berat
router.post('/bmi', wajibLogin, async (req, res) => {
  const tinggi = angka(req.body.tinggi_cm, 50, 250);
  const berat = angka(req.body.berat_kg, 10, 300);
  if (!tinggi) return res.status(400).json({ pesan: 'Tinggi badan harus 50–250 cm.' });
  if (!berat) return res.status(400).json({ pesan: 'Berat badan harus 10–300 kg.' });

  const hasil = hitungBmi(tinggi, berat);
  await db.query(
    'INSERT INTO bmi_records (user_id, tinggi_cm, berat_kg, bmi, kategori) VALUES (?, ?, ?, ?, ?)',
    [req.userId, tinggi, berat, hasil.bmi, hasil.kategori]
  );
  await db.query('UPDATE users SET tinggi_cm = ?, berat_kg = ? WHERE id = ?', [tinggi, berat, req.userId]);
  res.json(hasil);
});

// PUT /api/habits/:id  body: { selesai: true/false }  -> centang / batal centang hari ini
router.put('/habits/:id', wajibLogin, async (req, res) => {
  const habitId = Number(req.params.id);
  if (!Number.isInteger(habitId)) return res.status(400).json({ pesan: 'Kebiasaan tidak valid.' });

  const [ada] = await db.query('SELECT id FROM habits WHERE id = ?', [habitId]);
  if (!ada.length) return res.status(404).json({ pesan: 'Kebiasaan tidak ditemukan.' });

  if (req.body.selesai) {
    // Minimal: user harus sudah punya catatan data hari ini sebelum mencentang kebiasaan
    const [[hari]] = await db.query(
      'SELECT air_gelas, langkah, tidur_jam, kalori FROM health_logs WHERE user_id = ? AND tanggal = CURDATE()',
      [req.userId]
    );
    if (!hari) return res.status(400).json({ pesan: 'Isi data kesehatan hari ini dulu sebelum mencentang checklist.' });

    // Validasi khusus kebiasaan yang berpasangan dengan angka target
    const [h] = await db.query('SELECT nama FROM habits WHERE id = ?', [habitId]);
    const n = (h[0] && h[0].nama || '').toLowerCase();
    let ok = true;
    if (n.indexOf('minum 8 gelas') >= 0) ok = hari.air_gelas >= 8;
    else if (n.indexOf('olahraga') >= 0) ok = hari.kalori >= 150;
    else if (n.indexOf('jalan kaki') >= 0) ok = hari.langkah >= 5000;
    else if (n.indexOf('tidur') >= 0) ok = hari.tidur_jam >= 1;
    if (!ok) return res.status(400).json({ pesan: 'Data hari ini belum memenuhi syarat kebiasaan ini.' });

    await db.query('INSERT IGNORE INTO habit_logs (user_id, habit_id, tanggal) VALUES (?, ?, CURDATE())', [req.userId, habitId]);
  } else {
    await db.query('DELETE FROM habit_logs WHERE user_id = ? AND habit_id = ? AND tanggal = CURDATE()', [req.userId, habitId]);
  }
  res.json({ pesan: 'Tersimpan.' });
});

// ---------- Catat makanan (nilai resepsi lokal, tanpa AI) ----------
// GET /api/makanan  -> daftar makanan + nilai Calories per 100 gram
router.get('/makanan', wajibLogin, async (req, res) => {
  const [rows] = await db.query('SELECT id, nama, kategori, kcal_per_100g, takaran FROM foods ORDER BY kategori, nama');
  res.json({
    makanan: rows.map(function (m) {
      return { id: m.id, nama: m.nama, kategori: m.kategori, kcal_per_100g: Number(m.kcal_per_100g), takaran: m.takaran };
    })
  });
});

// POST /api/makanan  body: { makanan_id, jumlah_gram }  -> catat yang dimakan hari ini
router.post('/makanan', wajibLogin, async (req, res) => {
  const id = Number(req.body.makanan_id);
  const gram = angka(req.body.jumlah_gram, 1, 2000);

  if (!Number.isInteger(id)) return res.status(400).json({ pesan: 'Makanan tidak valid.' });
  if (Number.isNaN(gram)) return res.status(400).json({ pesan: 'Jumlah harus antara 1–2.000 gram.' });

  const [f] = await db.query('SELECT id, nama, kcal_per_100g FROM foods WHERE id = ?', [id]);
  if (!f.length) return res.status(404).json({ pesan: 'Makanan tidak ditemukan.' });

  // CATATAN: untuk INSERT, mysql2 hanya mengembalikan satu elemen (ResultSetHeader)
  const [hasil] = await db.query(
    'INSERT INTO food_logs (user_id, makanan_id, tanggal, jumlah_gram) VALUES (?, ?, CURDATE(), ?)',
    [req.userId, id, Math.round(gram)]
  );
  res.status(201).json({
    pesan: f[0].nama + ' (' + Math.round(gram) + ' g) tercatat.',
    id: hasil.insertId,
    nama: f[0].nama,
    jumlah_gram: Math.round(gram),
    // Energi = (kcal per 100 g x jumlah gram) / 100
    kcal: Math.round(Number(f[0].kcal_per_100g) * gram / 100)
  });
});

// DELETE /api/makanan/:id  -> hapus satu catatan makanan hari ini
router.delete('/makanan/:id', wajibLogin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ pesan: 'Catatan tidak valid.' });
  await db.query('DELETE FROM food_logs WHERE id = ? AND user_id = ? AND tanggal = CURDATE()', [id, req.userId]);
  res.json({ pesan: 'Catatan makanan dihapus.' });
});

module.exports = router;
module.exports.hitungBmi = hitungBmi;
