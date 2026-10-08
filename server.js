// AI Daily Healthy Assistant — server (Express + MySQL)
// Jalankan:  npm start   lalu buka http://localhost:3000
require('dotenv').config();
const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3000;

// Server berjalan di belakang cloudflared (tunnel) di komputer yang sama:
// percayai header X-Forwarded-* dari localhost agar IP pengunjung & status HTTPS terbaca benar
app.set('trust proxy', 'loopback');

// Route foto butuh body lebih besar (base64 gambar); didahulukan agar tidak dibatasi 50kb
app.use('/api/auth/foto', express.json({ limit: '3mb' }));
app.use(express.json({ limit: '50kb' }));
app.use(cookieParser());

// ---- API ----
// Batasi percobaan masuk/daftar agar password tidak bisa ditebak terus-menerus
const batasAuth = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: { pesan: 'Terlalu banyak percobaan. Coba lagi beberapa menit lagi.' }
});

app.use('/api/auth', batasAuth, require('./routes/auth'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api', require('./routes/health'));
app.use('/api', require('./routes/jadwal'));
app.use('/api', require('./routes/public'));

app.use('/api', function (req, res) {
  res.status(404).json({ pesan: 'Alamat API tidak ditemukan.' });
});

// ---- Halaman web (hanya folder tampilan yang dibuka ke publik) ----
const root = __dirname;
app.use('/css', express.static(path.join(root, 'css')));
app.use('/js', express.static(path.join(root, 'js')));
// extensions:'html' -> URL tanpa ekstensi, mis. /pages/kesehatan
app.use('/pages', express.static(path.join(root, 'pages'), { extensions: ['html'] }));
app.use('/assets', express.static(path.join(root, 'assets')));
app.use('/uploads', express.static(path.join(root, 'uploads')));
// ---- Favicon & ikon aplikasi (logo merek) ----
// Browser selalu meminta /favicon.ico, jadi rutenya diberi alamat pasti.
app.get('/favicon.ico', function (req, res) { res.sendFile(path.join(root, 'assets/favicon.ico')); });
app.get('/favicon.svg', function (req, res) { res.type('image/svg+xml').sendFile(path.join(root, 'assets/favicon.svg')); });
app.get('/apple-touch-icon.png', function (req, res) { res.sendFile(path.join(root, 'assets/apple-touch-icon.png')); });
app.get('/apple-touch-icon-precomposed.png', function (req, res) { res.sendFile(path.join(root, 'assets/apple-touch-icon.png')); });
app.get('/manifest.webmanifest', function (req, res) { res.type('application/manifest+json').sendFile(path.join(root, 'assets/manifest.webmanifest')); });

app.get(['/', '/index', '/index.html'], function (req, res) {
  res.sendFile(path.join(root, 'index.html'));
});

// ---- Penanganan error ----
app.use(function (err, req, res, next) {
  if (err.type === 'entity.parse.failed') return res.status(400).json({ pesan: 'Data yang dikirim tidak valid.' });
  console.error(err);
  res.status(500).json({ pesan: 'Terjadi kesalahan pada server. Pastikan MySQL menyala.' });
});

app.listen(PORT, function () {
  console.log('Server berjalan di http://localhost:' + PORT);
});
