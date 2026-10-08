// Daftar, masuk, keluar, dan cek siapa yang sedang login
const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { setLogin, hapusLogin, bacaUserId, angka } = require('../middleware');
const { hitungBmi } = require('./health');

const router = express.Router();
const POLA_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function dataUser(u) {
  return {
    id: u.id,
    nama: u.nama,
    email: u.email,
    role: u.role,
    jenis_kelamin: u.jenis_kelamin,
    tanggal_lahir: u.tanggal_lahir || null,
    tinggi_cm: u.tinggi_cm === null ? null : Number(u.tinggi_cm),
    berat_kg: u.berat_kg === null ? null : Number(u.berat_kg),
    foto: u.foto || null
  };
}

// Tanggal lahir: kembalikan 'YYYY-MM-DD' bila valid, null bila kosong,
// NaN bila formatnya salah / tanggalnya tidak masuk akal (masa depan / umur > 120).
function tanggalLahir(nilai) {
  if (nilai === '' || nilai === null || nilai === undefined) return null;
  const teks = String(nilai).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(teks)) return NaN;
  const d = new Date(teks + 'T00:00:00');
  if (Number.isNaN(d.getTime())) return NaN;
  const kini = new Date();
  if (d > kini) return NaN;                       // belum lahir
  if (kini.getFullYear() - d.getFullYear() > 120) return NaN; // tidak wajar
  return teks;
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const nama = String(req.body.nama || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  const jk = req.body.jenis_kelamin === 'L' || req.body.jenis_kelamin === 'P' ? req.body.jenis_kelamin : null;
  const lahir = tanggalLahir(req.body.tanggal_lahir);
  const tinggi = angka(req.body.tinggi_cm, 50, 250);
  const berat = angka(req.body.berat_kg, 10, 300);

  if (nama.length < 2 || nama.length > 60) return res.status(400).json({ pesan: 'Nama harus 2–60 huruf.' });
  if (!POLA_EMAIL.test(email) || email.length > 120) return res.status(400).json({ pesan: 'Format email tidak valid.' });
  if (password.length < 6 || password.length > 72) return res.status(400).json({ pesan: 'Password harus 6–72 karakter.' });
  if (Number.isNaN(lahir)) return res.status(400).json({ pesan: 'Tanggal lahir tidak valid.' });
  if (Number.isNaN(tinggi)) return res.status(400).json({ pesan: 'Tinggi badan harus 50–250 cm.' });
  if (Number.isNaN(berat)) return res.status(400).json({ pesan: 'Berat badan harus 10–300 kg.' });

  const [ada] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
  if (ada.length) return res.status(409).json({ pesan: 'Email sudah terdaftar. Silakan masuk.' });

  const hash = await bcrypt.hash(password, 10);
  const [hasil] = await db.query(
    'INSERT INTO users (nama, email, password_hash, jenis_kelamin, tanggal_lahir, tinggi_cm, berat_kg) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [nama, email, hash, jk, lahir, tinggi, berat]
  );

  // Jika tinggi & berat diisi saat daftar, langsung catat sebagai BMI pertama
  if (tinggi && berat) {
    const b = hitungBmi(tinggi, berat);
    await db.query(
      'INSERT INTO bmi_records (user_id, tinggi_cm, berat_kg, bmi, kategori) VALUES (?, ?, ?, ?, ?)',
      [hasil.insertId, tinggi, berat, b.bmi, b.kategori]
    );
  }

  await db.query('UPDATE users SET last_seen = NOW() WHERE id = ?', [hasil.insertId]);
  setLogin(req, res, hasil.insertId);
  res.status(201).json({ user: { id: hasil.insertId, nama, email, role: 'user', jenis_kelamin: jk, tanggal_lahir: lahir, tinggi_cm: tinggi, berat_kg: berat } });
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');

  const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
  const user = rows[0];
  // Pesan sengaja sama agar orang lain tidak bisa menebak email mana yang terdaftar
  const cocok = user ? await bcrypt.compare(password, user.password_hash) : false;
  if (!cocok) return res.status(401).json({ pesan: 'Email atau password salah.' });

  await db.query('UPDATE users SET last_seen = NOW() WHERE id = ?', [user.id]);
  setLogin(req, res, user.id);
  res.json({ user: dataUser(user) });
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  hapusLogin(res);
  res.json({ pesan: 'Berhasil keluar.' });
});

// GET /api/auth/me  -> { user: {...} } atau { user: null }
router.get('/me', async (req, res) => {
  const id = bacaUserId(req);
  if (!id) return res.json({ user: null });
  const [rows] = await db.query('SELECT * FROM users WHERE id = ?', [id]);
  if (!rows.length) {
    hapusLogin(res);
    return res.json({ user: null });
  }
  // Catat aktivitas (maksimal sekali per 5 menit agar database tidak terlalu sibuk)
  await db.query(
    'UPDATE users SET last_seen = NOW() WHERE id = ? AND (last_seen IS NULL OR last_seen < NOW() - INTERVAL 5 MINUTE)',
    [id]
  );
  res.json({ user: dataUser(rows[0]) });
});

// POST /api/auth/foto  -> unggah foto profil (client mengirim dataURL base64)
// Klien mengecilkan gambar dengan canvas sebelum upload, jadi payload kecil.
router.post('/foto', async (req, res) => {
  const id = bacaUserId(req);
  if (!id) return res.status(401).json({ pesan: 'Silakan masuk terlebih dahulu.' });
  const dataUrl = String(req.body.foto || '');
  const m = /^data:image\/(jpeg|jpg|png|webp);base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!m) return res.status(400).json({ pesan: 'Format foto tidak valid (JPEG/PNG/WebP).' });
  const ext = m[1] === 'jpg' ? 'jpeg' : m[1];
  const buffer = Buffer.from(m[2], 'base64');
  if (buffer.length > 2 * 1024 * 1024) return res.status(400).json({ pesan: 'Ukuran foto maksimal 2 MB.' });
  const fs = require('fs');
  const path = require('path');
  const dir = path.join(__dirname, '..', 'uploads');
  fs.mkdirSync(dir, { recursive: true });
  const namaFile = 'u' + id + '-' + Date.now() + '.' + ext;
  fs.writeFileSync(path.join(dir, namaFile), buffer);
  await db.query('UPDATE users SET foto = ? WHERE id = ?', ['/uploads/' + namaFile, id]);
  res.json({ pesan: 'Foto profil berhasil diperbarui.', url: '/uploads/' + namaFile });
});

// PUT /api/auth/profile  -> ubah nama, jenis kelamin, tanggal lahir, tinggi, berat
router.put('/profile', async (req, res) => {
  const id = bacaUserId(req);
  if (!id) return res.status(401).json({ pesan: 'Silakan masuk terlebih dahulu.' });
  const nama = String(req.body.nama || '').trim();
  const jk = req.body.jenis_kelamin === 'L' || req.body.jenis_kelamin === 'P' ? req.body.jenis_kelamin : null;
  const lahir = tanggalLahir(req.body.tanggal_lahir);
  const tinggi = angka(req.body.tinggi_cm, 50, 250);
  const berat = angka(req.body.berat_kg, 10, 300);
  if (nama.length < 2 || nama.length > 60) return res.status(400).json({ pesan: 'Nama harus 2–60 huruf.' });
  if (Number.isNaN(lahir)) return res.status(400).json({ pesan: 'Tanggal lahir tidak valid.' });
  if (Number.isNaN(tinggi)) return res.status(400).json({ pesan: 'Tinggi badan harus 50–250 cm.' });
  if (Number.isNaN(berat)) return res.status(400).json({ pesan: 'Berat badan harus 10–300 kg.' });
  await db.query('UPDATE users SET nama = ?, jenis_kelamin = ?, tanggal_lahir = ?, tinggi_cm = ?, berat_kg = ? WHERE id = ?',
    [nama, jk, lahir, tinggi, berat, id]);
  res.json({ pesan: 'Profil berhasil diperbarui.' });
});

// POST /api/auth/password  -> ganti password (butuh password lama)
router.post('/password', async (req, res) => {
  const id = bacaUserId(req);
  if (!id) return res.status(401).json({ pesan: 'Silakan masuk terlebih dahulu.' });
  const lama = String(req.body.password_lama || '');
  const baru = String(req.body.password_baru || '');
  if (baru.length < 6 || baru.length > 72) return res.status(400).json({ pesan: 'Password baru harus 6–72 karakter.' });
  const [rows] = await db.query('SELECT password_hash FROM users WHERE id = ?', [id]);
  if (!rows.length) return res.status(404).json({ pesan: 'Akun tidak ditemukan.' });
  const cocok = await bcrypt.compare(lama, rows[0].password_hash);
  if (!cocok) return res.status(401).json({ pesan: 'Password lama salah.' });
  const hash = await bcrypt.hash(baru, 10);
  await db.query('UPDATE users SET password_hash = ? WHERE id = ?', [hash, id]);
  res.json({ pesan: 'Password berhasil diganti.' });
});

module.exports = router;
