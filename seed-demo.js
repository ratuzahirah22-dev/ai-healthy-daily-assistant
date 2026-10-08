// ==========================================================================
//  Seed data demo: 2 pengguna baru + riwayat lengkap 14 hari terakhir.
//  Jalankan:  node seed-demo.js
//  Aman dijalankan berulang kali (akun & riwayat tidak diduplikasi).
//
//  Akun demo (password semuanya: Demo#12345)
//    andi@demo.id   — Andi Pratama, 172 cm / 78,5 kg
//    siti@demo.id   — Siti Nurhaliza, 160 cm / 52,3 kg
// ==========================================================================
require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('./db');

const PASSWORD = 'Demo#12345';

const PENGGUNA = [
  {
    email: 'andi@demo.id',
    nama: 'Andi Pratama',
    jk: 'L',
    tinggi: 172,
    berat: 78.5,
    // riwayat 14 hari: [air gelas, langkah, tidur jam, kalori, detak jantung]
    harian: [
      [8, 6200, 6.5, 1780, 80], [6, 5400, 6.0, 1650, 82], [7, 8900, 7.2, 1900, 76],
      [8, 10200, 7.5, 2050, 74], [5, 4300, 5.5, 1520, 85], [8, 9600, 7.0, 1980, 75],
      [8, 11800, 8.0, 2150, 72], [6, 7100, 6.8, 1800, 78], [7, 8400, 7.0, 1880, 77],
      [4, 3900, 5.2, 1480, 88], [8, 10600, 7.4, 2080, 73], [7, 9200, 7.2, 1960, 75],
      [8, 12100, 8.0, 2200, 71], [8, 9800, 7.5, 2000, 74]
    ],
    // kebiasaan per hari (id dari tabel habits, 1..7), dibuat dari data harian di atas
    kebiasaan: [
      [1, 2, 3, 5, 7], [3, 7], [1, 2, 3, 4, 5, 7], [1, 2, 3, 5, 6], [3, 7],
      [1, 2, 3, 5, 6, 7], [1, 2, 3, 4, 5, 6, 7], [3, 5, 7], [1, 2, 3, 5, 7],
      [3], [1, 2, 3, 4, 5, 6], [1, 2, 3, 5, 7], [1, 2, 3, 4, 5, 6, 7], [1, 2, 3, 5, 6, 7]
    ],
    // riwayat BMI (tinggi tetap, berat turun gradually)
    bmi: [
      [78.5, 13], [77.8, 11], [77.0, 9], [76.4, 7], [75.6, 5], [75.0, 3], [74.3, 1]
    ],
    chat: [
      ['user', 'Halo, saya Andi. Berat badan saya 78 kg dan tinggi 172 cm. Apakah itu obesitas?'],
      ['assistant', 'Halo Andi! Dengan tinggi 172 cm dan berat 78 kg, BMI Anda sekitar 26,4 yang masuk kategori Berat Berlebih (obesitas ringan), belum obesitas berat. Saran saya: jaga pola makan, olahraga rutin 30 menit 5 kali seminggu, dan cukup tidur 7-8 jam. Ada yang ingin ditanyakan lagi?'],
      ['user', 'Oke, berapa langkah harian yang perlu saya mulai?'],
      ['assistant', 'Untuk mulai, targetkan 8.000 langkah per hari. Mulai dari 6.000 lalu naikkan 500-1.000 langkah tiap minggunya. Jalan kaki 20-30 menit setelah makan malam sangat membantu proses pembakaran lemak.'],
      ['user', 'Bagaimana cara menghitung kebutuhan kalori harian saya?'],
      ['assistant', 'Gunakan rumus metabolisme basal dikali faktor aktivitas: (tinggi cm × 7) - (berat kg × 60), lalu dikalikan 1,2 untuk yang kurang aktif sampai 1,9 untuk yang sangat aktif. Untuk Anda sekitar 2.100-2.300 kkal per hari.'],
      ['user', 'Apakah intermittent fasting aman untuk saya?'],
      ['assistant', 'Intermittent fasting 16:8 bisa dipertimbangkan jika Anda sehat, namun pastikan intake protein cukup di jam makan utama. Jangan lakukan bila ada riwayat diabetes, hamil, atau gangguan makan. Cara paling aman: mulai 14:10 lalu tambah bertahap.']
    ],
    usage: [[820, 240, 1060], [910, 265, 1175], [760, 195, 955], [880, 310, 1190], [695, 180, 875]],
    ulasan: {
      isi: 'Awalnya cuma iseng coba, tapi sekarang fitur health tracking-nya benar-benar bantu saya turun 4 kg dalam 3 bulan. Progress tiap hari kelihatan jelas.',
      kota: 'Semarang',
      rating: 5,
      status: 'diterima'
    }
  },
  {
    email: 'siti@demo.id',
    nama: 'Siti Nurhaliza',
    jk: 'P',
    tinggi: 160,
    berat: 52.3,
    harian: [
      [8, 7800, 7.0, 1520, 72], [8, 9200, 7.5, 1610, 70], [7, 6500, 6.8, 1450, 74],
      [8, 10400, 8.0, 1680, 68], [8, 8600, 7.2, 1550, 71], [6, 5100, 6.0, 1380, 76],
      [8, 9900, 7.8, 1650, 69], [8, 8300, 7.0, 1530, 72], [7, 7400, 6.8, 1480, 73],
      [8, 11200, 8.2, 1720, 67], [8, 9100, 7.4, 1590, 70], [8, 8700, 7.0, 1540, 71],
      [6, 5800, 6.2, 1400, 75], [8, 9500, 7.6, 1620, 69]
    ],
    kebiasaan: [
      [1, 3, 4, 6, 7], [1, 2, 3, 4, 5, 6], [1, 3, 4, 7], [1, 2, 3, 4, 5, 6, 7], [1, 3, 4, 6],
      [1, 7], [1, 2, 3, 4, 5, 6], [1, 3, 4, 6, 7], [1, 3, 4, 6],
      [1, 2, 3, 4, 5, 6, 7], [1, 3, 4, 6, 7], [1, 3, 4, 6], [1, 3, 7], [1, 2, 3, 4, 5, 6]
    ],
    bmi: [
      [52.3, 13], [52.0, 10], [51.6, 7], [51.1, 4], [50.4, 1]
    ],
    chat: [
      ['user', 'Selamat pagi, saya Siti. Tidur saya sering terbangun jam 3 pagi, kenapa ya?'],
      ['assistant', 'Selamat pagi Siti. Bangun tengah malam bisa terjadi karena stres, kafein, atau gangguan tidur. Coba kurangi kafein setelah jam 2 siang, jaga suhu kamar 22-24°C, dan lakukan relaksasi 10 menit sebelum tidur. Bila berlangsung lebih dari 3 bulan, sebaiknya periksakan diri ke dokter.'],
      ['user', 'Berapa batasnya jika saya minum kopi 2 cangkir sehari?'],
      ['assistant', 'Dua cangkir sehari masih aman bagi kebanyakan orang (batas anjuran WHO sekitar 400 mg kafein per hari). Namun, jangan minum kopi setelah jam 14.00 agar tidak mengganggu kualitas tidur, dan pilih yang tanpa gula atau sedikit pemanis.'],
      ['user', 'Apakah latihan fisik bisa saya lakukan di rumah tanpa alat?'],
      ['assistant', 'Bisa. Latihan seperti squats, plank, glute bridge, dan jumping jack bisa dilakukan tanpa alat. Untuk sesi 20 menit: 3 set of 12 squats, 3 × 30 detik plank, dan 2 set of 15 glute bridge. Ulangi 3-4 kali seminggu dengan istirahat 1-2 hari.'],
      ['user', 'Seberapa penting sarapan pagi untuk kesehatan?'],
      ['assistant', 'Sarapan penting sebagai sumber energi dan membantu mengatur nafsu makan sepanjang hari. Pilihlah yang tinggi protein seperti telur, yoghurt, atau kacang-kacangan, lebih baik daripada sarapan manis.']
    ],
    usage: [[740, 210, 950], [860, 280, 1140], [805, 225, 1030]],
    ulasan: {
      isi: 'Rekomendasi tidurnya ternyata akurat, saya akhirnya bisa tidur penuh 7 jam. Ulasan ini sengaja dibiarkan menunggu supaya bisa lihat fitur moderasi admin.',
      kota: 'Palembang',
      rating: 4,
      status: 'menunggu'
    }
  }
];

function hitungBmi(tinggiCm, beratKg) {
  const m = tinggiCm / 100;
  const bmi = Math.round((beratKg / (m * m)) * 10) / 10;
  let kategori = 'Obesitas';
  if (bmi < 18.5) kategori = 'Berat Kurang';
  else if (bmi < 25) kategori = 'Berat Ideal';
  else if (bmi < 30) kategori = 'Berat Berlebih';
  return { bmi, kategori };
}

async function seedUser(p) {
  // 1. Akun (dibuat ulang bila email sudah ada, tanpa menggandakan data)
  const [ada] = await db.query('SELECT id FROM users WHERE email = ?', [p.email]);
  let uid;
  if (ada.length) {
    uid = ada[0].id;
    await db.query('UPDATE users SET nama = ?, jenis_kelamin = ?, tinggi_cm = ?, berat_kg = ? WHERE id = ?',
      [p.nama, p.jk, p.tinggi, p.berat, uid]);
    console.log('  - akun ' + p.email + ' sudah ada (id ' + uid + '), profil diperbarui');
  } else {
    const hash = await bcrypt.hash(PASSWORD, 10);
    const [h] = await db.query(
      'INSERT INTO users (nama, email, password_hash, role, jenis_kelamin, tinggi_cm, berat_kg, last_seen) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())',
      [p.nama, p.email, hash, 'user', p.jk, p.tinggi, p.berat]
    );
    uid = h.insertId;
    console.log('  - akun ' + p.email + ' dibuat (id ' + uid + ')');
  }

  // 2. Catatan kesehatan harian 14 hari terakhir
  for (let i = 0; i < p.harian.length; i++) {
    const delta = p.harian.length - 1 - i; // index 0 = 13 hari lalu, index akhir = hari ini
    const [air, langkah, tidur, kalori, detak] = p.harian[i];
    await db.query(
      `INSERT INTO health_logs (user_id, tanggal, air_gelas, langkah, tidur_jam, kalori, detak_jantung)
       VALUES (?, CURDATE() - INTERVAL ? DAY, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE air_gelas = VALUES(air_gelas), langkah = VALUES(langkah),
         tidur_jam = VALUES(tidur_jam), kalori = VALUES(kalori), detak_jantung = VALUES(detak_jantung)`,
      [uid, delta, air, langkah, tidur, kalori, detak]
    );
  }
  console.log('  - health_logs: ' + p.harian.length + ' hari');

  // 3. Ceklis kebiasaan (dibuat ulang dari nol supaya sama persis dengan pola di atas)
  await db.query('DELETE FROM habit_logs WHERE user_id = ?', [uid]);
  for (let i = 0; i < p.kebiasaan.length; i++) {
    const delta = p.kebiasaan.length - 1 - i;
    for (const habitId of p.kebiasaan[i]) {
      await db.query('INSERT IGNORE INTO habit_logs (user_id, habit_id, tanggal) VALUES (?, ?, CURDATE() - INTERVAL ? DAY)',
        [uid, habitId, delta]);
    }
  }
  console.log('  - habit_logs: ' + p.kebiasaan.reduce(function (n, a) { return n + a.length; }, 0) + ' centang');

  // 4. Riwayat BMI
  await db.query('DELETE FROM bmi_records WHERE user_id = ?', [uid]);
  for (const [berat, delta] of p.bmi) {
    const hasil = hitungBmi(p.tinggi, berat);
    await db.query(
      'INSERT INTO bmi_records (user_id, tinggi_cm, berat_kg, bmi, kategori, created_at) VALUES (?, ?, ?, ?, ?, NOW() - INTERVAL ? DAY)',
      [uid, p.tinggi, berat, hasil.bmi, hasil.kategori, delta]
    );
  }
  console.log('  - bmi_records: ' + p.bmi.length + ' riwayat');

  // 5. Riwayat chat + pemakaian token
  await db.query('DELETE FROM chat_messages WHERE user_id = ?', [uid]);
  const base = Math.max(1, 13 - p.chat.length / 2);
  for (let i = 0; i < p.chat.length; i++) {
    const [role, isi] = p.chat[i];
    await db.query(
      'INSERT INTO chat_messages (user_id, role, isi, created_at) VALUES (?, ?, ?, NOW() - INTERVAL ? HOUR)',
      [uid, role, isi, base + i * 6]
    );
  }
  await db.query('DELETE FROM chat_usage WHERE user_id = ?', [uid]);
  for (let i = 0; i < p.usage.length; i++) {
    const [prompt, completion] = p.usage[i];
    await db.query(
      `INSERT INTO chat_usage (user_id, model, prompt_tokens, completion_tokens, total_tokens, created_at)
       VALUES (?, 'gpt-4o-mini', ?, ?, ?, NOW() - INTERVAL ? DAY)`,
      [uid, prompt, completion, prompt + completion, (p.usage.length - i) * 3]
    );
  }
  console.log('  - chat: ' + p.chat.length + ' pesan, chat_usage: ' + p.usage.length + ' jawaban');

  // 6. Ulasan (d moderated lewat status yang sudah ditentukan)
  await db.query(
    `INSERT INTO testimonials (user_id, nama, kota, isi, rating, status, ditinjau_at)
     VALUES (?, ?, ?, ?, ?, ?, NOW())
     ON DUPLICATE KEY UPDATE kota = VALUES(kota), isi = VALUES(isi), rating = VALUES(rating),
       status = VALUES(status), ditinjau_at = NOW()`,
    [uid, p.nama, p.ulasan.kota, p.ulasan.isi, p.ulasan.rating, p.ulasan.status]
  );
  console.log('  - ulasan: "' + p.ulasan.isi.slice(0, 45) + '..." (' + p.ulasan.status + ')');
}

(async () => {
  console.log('Seed 2 pengguna demo + riwayat 14 hari\n');
  for (const p of PENGGUNA) {
    console.log(p.nama + ' <' + p.email + '>');
    await seedUser(p);
    console.log('');
  }
  console.log('Selesai. Akun demo (password: ' + PASSWORD + '):');
  PENGGUNA.forEach(function (p) { console.log('  ' + p.email); });
  process.exit(0);
})().catch(function (e) {
  console.error('GAGAL:', e.message);
  process.exit(1);
});
