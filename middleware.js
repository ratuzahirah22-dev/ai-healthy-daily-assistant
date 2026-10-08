// Fungsi bantu untuk login (token JWT disimpan di cookie httpOnly)
const jwt = require('jsonwebtoken');
const db = require('./db');

if (!process.env.JWT_SECRET) {
  console.error('[GAGAL] JWT_SECRET belum diisi di file .env (salin dari .env.example).');
  process.exit(1);
}

const SECRET = process.env.JWT_SECRET;
const TUJUH_HARI = 7 * 24 * 60 * 60 * 1000;

// Buat token lalu simpan di cookie
function setLogin(req, res, userId) {
  const token = jwt.sign({ id: userId }, SECRET, { expiresIn: '7d' });
  res.cookie('token', token, {
    httpOnly: true,            // tidak bisa dibaca JavaScript di browser
    sameSite: 'lax',
    secure: req.secure,        // true saat diakses lewat HTTPS (mis. lewat tunnel Cloudflare), false di http://localhost
    maxAge: TUJUH_HARI
  });
}

function hapusLogin(res) {
  res.clearCookie('token');
}

// Ambil id user dari cookie (null jika belum login / token salah)
function bacaUserId(req) {
  const token = req.cookies && req.cookies.token;
  if (!token) return null;
  try {
    return jwt.verify(token, SECRET).id;
  } catch (e) {
    return null;
  }
}

// Dipasang di route yang WAJIB login
function wajibLogin(req, res, next) {
  const id = bacaUserId(req);
  if (!id) return res.status(401).json({ pesan: 'Silakan masuk terlebih dahulu.' });
  req.userId = id;
  next();
}

// Dipasang di route khusus ADMIN. Role dicek ulang ke database (bukan dari token)
async function wajibAdmin(req, res, next) {
  const id = bacaUserId(req);
  if (!id) return res.status(401).json({ pesan: 'Silakan masuk terlebih dahulu.' });
  const [rows] = await db.query('SELECT role FROM users WHERE id = ?', [id]);
  if (!rows.length || rows[0].role !== 'admin') return res.status(403).json({ pesan: 'Khusus admin.' });
  req.userId = id;
  next();
}

// Validasi angka: kembalikan angka valid, null jika kosong, NaN jika di luar batas
function angka(nilai, min, max) {
  if (nilai === '' || nilai === null || nilai === undefined) return null;
  const n = Number(nilai);
  if (!Number.isFinite(n) || n < min || n > max) return NaN;
  return n;
}

module.exports = { setLogin, hapusLogin, bacaUserId, wajibLogin, wajibAdmin, angka };
