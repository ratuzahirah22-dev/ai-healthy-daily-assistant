// Data untuk beranda: statistik, testimoni, newsletter
// CATATAN: ulasan hanya ditampilkan publik setelah di-setujui admin (status = 'diterima').
// Ulasan berstatus 'menunggu' atau 'ditolak' tidak pernah keluar lewat API di bawah.
const express = require('express');
const db = require('../db');
const { wajibLogin } = require('../middleware');

const router = express.Router();
const POLA_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// GET /api/stats  -> angka asli dari database
router.get('/stats', async (req, res) => {
  const [[u]] = await db.query('SELECT COUNT(*) AS n FROM users');
  const [[k]] = await db.query('SELECT COUNT(*) AS n FROM chat_usage'); // satu baris per pertanyaan yang dijawab AI
  // Rating dihitung dari ulasan yang sudah disetujui admin saja
  const [[r]] = await db.query("SELECT AVG(rating) AS rata, COUNT(*) AS n FROM testimonials WHERE status = 'diterima'");
  res.json({
    pengguna: u.n,
    konsultasi: k.n,
    rating: r.n ? Math.round(Number(r.rata) * 10) / 10 : 0
  });
});

// GET /api/testimonials  -> 3 ulasan terbaru yang sudah disetujui admin
router.get('/testimonials', async (req, res) => {
  const [rows] = await db.query(
    "SELECT nama, kota, isi, rating FROM testimonials WHERE status = 'diterima' ORDER BY created_at DESC, id DESC LIMIT 3"
  );
  // Urutkan agar kartu yang tampil menonjol (tengah) tetap ada di tampilan 3 kolom
  res.json({ testimoni: rows.reverse() });
});

// GET /api/testimonials/saya  -> status ulasan milik pengguna yang sedang login
// (agar form di beranda bisa memberi tahu: menunggu / ditolak / sudah tampil)
router.get('/testimonials/saya', wajibLogin, async (req, res) => {
  const [[row]] = await db.query(
    "SELECT isi, kota, rating, status, created_at FROM testimonials WHERE user_id = ?",
    [req.userId]
  );
  if (!row) return res.json({ ulasan: null });
  res.json({
    ulasan: {
      isi: row.isi,
      kota: row.kota,
      rating: Number(row.rating),
      status: row.status,
      dibuat: row.created_at,
      tampil: row.status === 'diterima'
    }
  });
});

// POST /api/testimonials  (harus login, satu ulasan per pengguna — mengirim lagi = memperbarui)
// Ulasan baru SELALU berstatus 'menunggu' dan harus disetujui admin sebelum tampil di beranda.
router.post('/testimonials', wajibLogin, async (req, res) => {
  const isi = String(req.body.isi || '').trim();
  const kota = String(req.body.kota || '').trim().slice(0, 40);
  const rating = Number(req.body.rating);
  if (isi.length < 10 || isi.length > 400) return res.status(400).json({ pesan: 'Ulasan harus 10–400 karakter.' });
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return res.status(400).json({ pesan: 'Rating harus 1–5.' });

  const [[user]] = await db.query('SELECT nama FROM users WHERE id = ?', [req.userId]);
  // Mengirim ulang = memperbarui ulasan sendiri, dan statusnya kembali ke 'menunggu'
  await db.query(
    `INSERT INTO testimonials (user_id, nama, kota, isi, rating, status) VALUES (?, ?, ?, ?, ?, 'menunggu')
     ON DUPLICATE KEY UPDATE kota = VALUES(kota), isi = VALUES(isi), rating = VALUES(rating),
       status = 'menunggu', ditinjau_at = NULL, ditinjau_oleh = NULL, created_at = NOW()`,
    [req.userId, user.nama, kota, isi, rating]
  );
  res.status(201).json({ pesan: 'Terima kasih! Ulasanmu sedang ditinjau admin dan akan tampil setelah disetujui.', status: 'menunggu' });
});

// POST /api/newsletter  body: { email }
router.post('/newsletter', async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  if (!POLA_EMAIL.test(email) || email.length > 120) return res.status(400).json({ pesan: 'Format email tidak valid.' });
  await db.query('INSERT IGNORE INTO subscribers (email) VALUES (?)', [email]);
  res.json({ pesan: 'Terima kasih sudah berlangganan!' });
});

module.exports = router;
