// Skrip sekali-jalan: membuat akun admin dari nilai ADMIN_PASSWORD di .env.
// Jalankan:  node buat-admin.js
// Hapus file ini setelah akun dibuat agar tidak tertinggal di project.
require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('./db');

const EMAIL = 'admin-ratu@gmail.com';
const NAMA = 'Admin Ratu';

(async () => {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) {
    console.error('ADMIN_PASSWORD tidak ditemukan di .env');
    process.exit(1);
  }
  if (password.length < 6 || password.length > 72) {
    console.error('Password harus 6–72 karakter (sama seperti validasi aplikasi).');
    process.exit(1);
  }

  const [ada] = await db.query('SELECT id, role FROM users WHERE email = ?', [EMAIL]);
  if (ada.length) {
    const u = ada[0];
    if (u.role === 'admin') {
      console.log('Akun admin sudah ada (id ' + u.id + ') — tidak ada yang diubah.');
      process.exit(0);
    }
    const hash = await bcrypt.hash(password, 10);
    await db.query('UPDATE users SET password_hash = ?, role = ? WHERE id = ?', [hash, 'admin', u.id]);
    console.log('OK: akun id ' + u.id + ' (' + EMAIL + ') diubah menjadi admin.');
    process.exit(0);
  }

  const hash = await bcrypt.hash(password, 10);
  const [hasil] = await db.query(
    'INSERT INTO users (nama, email, password_hash, role, last_seen) VALUES (?, ?, ?, ?, NOW())',
    [NAMA, EMAIL, hash, 'admin']
  );
  console.log('OK: admin baru dibuat, id ' + hasil.insertId + ' (' + EMAIL + ')');
  process.exit(0);
})().catch(function (err) {
  console.error('GAGAL:', err.message);
  process.exit(1);
});
