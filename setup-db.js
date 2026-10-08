// Membuat database + tabel dari schema.sql, lalu mengisi data awal.
// Jalankan:  npm run setup   (pastikan MySQL di XAMPP sudah Start)
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const { PROMPT_BAWAAN } = require('./defaults');

// Testimoni contoh (diambil dari tampilan awal beranda), hanya diisi jika tabel masih kosong
const TESTIMONI_AWAL = [
  ['Sari Dewi', 'Jakarta', 'AI Chat Bot-nya luar biasa! Selalu memberikan saran yang tepat dan personal. Sudah 3 bulan menggunakan dan berat badan saya turun 5 kg secara sehat.', 5],
  ['Budi Santoso', 'Surabaya', 'Fitur tracking kesehatannya sangat membantu saya memantau perkembangan. Dashboard-nya intuitif dan mudah digunakan. Sangat recommended!', 5],
  ['Rina Wati', 'Bandung', 'Sejak pakai AI Healthy Assistant, pola tidur saya membaik drastis. Rekomendasi meditasinya juga sangat membantu mengurangi stres. Terima kasih!', 5]
];

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true
  });

  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  await conn.query(sql);
  console.log('[OK] Database & tabel siap.');

  // Database lama (versi sebelum ada admin): tambahkan kolom role jika belum ada
  const [kolom] = await conn.query("SHOW COLUMNS FROM ai_healthy.users LIKE 'role'");
  if (!kolom.length) {
    await conn.query("ALTER TABLE ai_healthy.users ADD COLUMN role ENUM('user','admin') NOT NULL DEFAULT 'user' AFTER berat_kg");
    console.log('[OK] Kolom role ditambahkan ke tabel users.');
  }

  const [kolomSeen] = await conn.query("SHOW COLUMNS FROM ai_healthy.users LIKE 'last_seen'");
  if (!kolomSeen.length) {
    await conn.query('ALTER TABLE ai_healthy.users ADD COLUMN last_seen TIMESTAMP NULL DEFAULT NULL AFTER role');
    console.log('[OK] Kolom last_seen ditambahkan ke tabel users.');
  }

  // Database lama: tambahkan tanggal lahir (dipakai menghitung umur untuk target personal)
  const [kolomLahir] = await conn.query("SHOW COLUMNS FROM ai_healthy.users LIKE 'tanggal_lahir'");
  if (!kolomLahir.length) {
    await conn.query('ALTER TABLE ai_healthy.users ADD COLUMN tanggal_lahir DATE NULL AFTER jenis_kelamin');
    console.log('[OK] Kolom tanggal_lahir ditambahkan ke tabel users.');
  }

  // Moderasi ulasan: database lama belum punya kolom status
  const [kolomStatus] = await conn.query("SHOW COLUMNS FROM ai_healthy.testimonials LIKE 'status'");
  if (!kolomStatus.length) {
    // Ulasan lama sudah tampil publik di beranda, jadi dianggap 'diterima' (bukan 'menunggu')
    await conn.query("ALTER TABLE ai_healthy.testimonials ADD COLUMN status ENUM('menunggu','draft','diterima','ditolak') NOT NULL DEFAULT 'menunggu' AFTER rating");
    await conn.query("UPDATE ai_healthy.testimonials SET status = 'diterima' WHERE status = 'menunggu'");
    console.log('[OK] Kolom status ditambahkan ke tabel testimonials (ulasan lama = sudah tampil).');
  }
  // Database lama: tambahkan nilai 'draft' ke daftar status yang sudah ada
  if (kolomStatus.length && String(kolomStatus[0].Column_type).indexOf("'draft'") < 0) {
    await conn.query("ALTER TABLE ai_healthy.testimonials MODIFY COLUMN status ENUM('menunggu','draft','diterima','ditolak') NOT NULL DEFAULT 'menunggu'");
    console.log('[OK] Nilai status draft ditambahkan ke tabel testimonials.');
  }

  const [kolomTinjau] = await conn.query("SHOW COLUMNS FROM ai_healthy.testimonials LIKE 'ditinjau_at'");
  if (!kolomTinjau.length) {
    await conn.query('ALTER TABLE ai_healthy.testimonials ADD COLUMN ditinjau_at TIMESTAMP NULL DEFAULT NULL AFTER status, ADD COLUMN ditinjau_oleh INT UNSIGNED NULL AFTER ditinjau_at');
    console.log('[OK] Kolom ditinjau_at & ditinjau_oleh ditambahkan ke tabel testimonials.');
  }

  // Pengaturan chatbot awal (nonaktif sampai admin mengisi API key)
  await conn.query('INSERT IGNORE INTO ai_healthy.chatbot_settings (id, system_prompt) VALUES (1, ?)', [PROMPT_BAWAAN]);

  const [rows] = await conn.query('SELECT COUNT(*) AS n FROM testimonials');
  if (rows[0].n === 0) {
    await conn.query("INSERT INTO testimonials (nama, kota, isi, rating, status) VALUES ?", TESTIMONI_AWAL.map(function (t) {
      return t.concat(['diterima']); // testimoni bawaan langsung disetujui admin
    }));
    console.log('[OK] Testimoni contoh ditambahkan.');
  }

  await conn.end();
  console.log('Selesai. Jalankan server dengan:  npm start');
}

main().catch(function (err) {
  console.error('[GAGAL] Setup database:', err.message);
  console.error('Pastikan MySQL di XAMPP sudah Start dan isi file .env benar.');
  process.exit(1);
});
