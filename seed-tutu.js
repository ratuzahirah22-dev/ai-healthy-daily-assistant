// Seed data riwayat 7 hari terakhir untuk akun "tutu".
// Aman dijalankan berulang (INSERT ... ON DUPLICATE KEY UPDATE).
require('dotenv').config();
const db = require('./db');

const USER_ID = 2; // tutu

(async () => {
  // Data 7xk27 hari terakhir: tiur_jam 1 desimal, langkah realistis
  const data = [
    // tanggal, air_gelas, langkah, tidur_jam, kalori, detak_jantung
    [6, 6, 7200, 6.5, 1650, 78],
    [5, 8, 10500, 7.0, 1900, 72],
    [4, 5, 5400, 5.8, 1500, 82],
    [3, 9, 12300, 7.4, 2100, 70],
    [2, 7, 8900, 7.2, 1800, 74],
    [1, 8, 9800, 6.8, 1850, 73],
    [0, 6, 6100, 7.0, 1700, 75], // hari ini
  ];

  for (const [delta, air, langkah, tidur, kalori, detak] of data) {
    await db.query(
      `INSERT INTO health_logs (user_id, tanggal, air_gelas, langkah, tidur_jam, kalori, detak_jantung)
       VALUES (?, CURDATE() - INTERVAL ? DAY, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE air_gelas=VALUES(air_gelas), langkah=VALUES(langkah),
         tidur_jam=VALUES(tidur_jam), kalori=VALUES(kalori), detak_jantung=VALUES(detak_jantung)`,
      [USER_ID, delta, air, langkah, tidur, kalori, detak]
    );
  }
  console.log('OK:7 baris health_logs untuk user_id=' + USER_ID);

  // Isi juga habit_logs acak 3-5 kebiasaan/hari agar cekeclist tampil
  const [habits] = await db.query('SELECT id FROM habits ORDER BY id');
  for (const [delta] of data) {
    const jumlah = 3 + Math.floor(Math.random() * 3); // 3..5
    const dipilih = habits.sort(() => Math.random() - 0.5).slice(0, jumlah);
    for (const h of dipilih) {
      await db.query(
        'INSERT IGNORE INTO habit_logs (user_id, habit_id, tanggal) VALUES (?, ?, CURDATE() - INTERVAL ? DAY)',
        [USER_ID, h.id, delta]
      );
    }
  }
  console.log('OK: habit_logs ikut diisi.');
  process.exit(0);
})().catch(e => { console.error('GAGAL:', e.message); process.exit(1); });
