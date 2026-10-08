// Jadwal & pengingat kegiatan pengguna (halaman "Jadwal Hari Ini")
// ulangi: 'sekali'   -> hanya pada kolom `tanggal`
//         'harian'   -> setiap hari
//         'mingguan' -> setiap minggu pada kolom `hari` (1=Minggu ... 7=Sabtu, sama dengan DAYOFWEEK)
const express = require('express');
const db = require('../db');
const { wajibLogin } = require('../middleware');

const router = express.Router();

const ULANGI = ['sekali', 'harian', 'mingguan'];

// Siapkan tabel bila belum ada, supaya update ini tidak wajib menjalankan "npm run setup" lagi.
db.query(`
  CREATE TABLE IF NOT EXISTS schedules (
    id         INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id    INT UNSIGNED NOT NULL,
    judul      VARCHAR(120) NOT NULL,
    kategori   VARCHAR(30)  NOT NULL DEFAULT 'Umum',
    waktu      TIME         NOT NULL,
    catatan    VARCHAR(255) NULL,
    ulangi     ENUM('sekali','harian','mingguan') NOT NULL DEFAULT 'harian',
    tanggal    DATE         NULL,
    hari       TINYINT UNSIGNED NULL,
    created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_user (user_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB
`).then(function () {
  return db.query(`
    CREATE TABLE IF NOT EXISTS schedule_done (
      user_id     INT UNSIGNED NOT NULL,
      schedule_id INT UNSIGNED NOT NULL,
      tanggal     DATE         NOT NULL,
      PRIMARY KEY (user_id, schedule_id, tanggal),
      FOREIGN KEY (user_id)     REFERENCES users(id)     ON DELETE CASCADE,
      FOREIGN KEY (schedule_id) REFERENCES schedules(id) ON DELETE CASCADE
    ) ENGINE=InnoDB
  `);
}).catch(function (e) {
  console.error('[Jadwal] gagal menyiapkan tabel:', e.message);
});

// ---------- Utilitas validasi ----------
function teks(v, maks) {
  if (v === undefined || v === null) return '';
  return String(v).trim().slice(0, maks);
}
function waktuValid(s) { return /^([01]\d|2[0-3]):[0-5]\d$/.test(String(s || '')); }
function tanggalValid(s) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(s || '')) && !Number.isNaN(Date.parse(s));
}
function rapikanWaktu(w) { return String(w || '').slice(0, 5); }

function keObjek(r) {
  return {
    id: r.id,
    judul: r.judul,
    kategori: r.kategori,
    waktu: rapikanWaktu(r.waktu),
    catatan: r.catatan || '',
    ulangi: r.ulangi,
    tanggal: r.tanggal || null,
    hari: r.hari === null || r.hari === undefined ? null : Number(r.hari),
    selesai: !!r.selesai
  };
}

// ---------- GET /api/jadwal  -> jadwal hari ini + jadwal sekali yang akan datang ----------
router.get('/jadwal', wajibLogin, async (req, res) => {
  const uid = req.userId;

  // Jadwal yang jatuh tempo hari ini:
  //  - harian selalu tampil
  //  - sekali bila tanggalnya hari ini
  //  - mingguan bila harinya sama dengan hari ini
  const [hariIni] = await db.query(
    `SELECT s.id, s.judul, s.kategori, s.waktu, s.catatan, s.ulangi, s.tanggal, s.hari,
            (sd.schedule_id IS NOT NULL) AS selesai
       FROM schedules s
       LEFT JOIN schedule_done sd
              ON sd.schedule_id = s.id AND sd.user_id = ? AND sd.tanggal = CURDATE()
      WHERE s.user_id = ?
        AND ( s.ulangi = 'harian'
           OR (s.ulangi = 'sekali'   AND s.tanggal = CURDATE())
           OR (s.ulangi = 'mingguan' AND s.hari = DAYOFWEEK(CURDATE())) )
      ORDER BY s.waktu, s.id`,
    [uid, uid]
  );

  const [mendatang] = await db.query(
    `SELECT id, judul, kategori, waktu, catatan, tanggal
       FROM schedules
      WHERE user_id = ? AND ulangi = 'sekali' AND tanggal > CURDATE()
      ORDER BY tanggal, waktu
      LIMIT 20`,
    [uid]
  );

  res.json({
    hari_ini: hariIni.map(keObjek),
    mendatang: mendatang.map(function (m) {
      return {
        id: m.id, judul: m.judul, kategori: m.kategori,
        waktu: rapikanWaktu(m.waktu), catatan: m.catatan || '', tanggal: m.tanggal
      };
    })
  });
});

// ---------- POST /api/jadwal  -> tambah jadwal ----------
router.post('/jadwal', wajibLogin, async (req, res) => {
  const judul = teks(req.body.judul, 120);
  const kategori = teks(req.body.kategori, 30) || 'Umum';
  const catatan = teks(req.body.catatan, 255) || null;
  const waktu = String(req.body.waktu || '');
  const ulangi = String(req.body.ulangi || 'harian');

  if (!judul) return res.status(400).json({ pesan: 'Nama kegiatan wajib diisi.' });
  if (!waktuValid(waktu)) return res.status(400).json({ pesan: 'Waktu tidak valid (contoh: 07:30).' });
  if (ULANGI.indexOf(ulangi) < 0) return res.status(400).json({ pesan: 'Pilihan pengulangan tidak valid.' });

  let tanggal = null;
  let hari = null;
  if (ulangi === 'sekali') {
    if (!tanggalValid(req.body.tanggal)) return res.status(400).json({ pesan: 'Pilih tanggal yang valid.' });
    tanggal = req.body.tanggal;
  } else if (ulangi === 'mingguan') {
    const h = Number(req.body.hari);
    if (!(h >= 1 && h <= 7)) return res.status(400).json({ pesan: 'Pilih hari yang valid.' });
    hari = h;
  }

  const [hasil] = await db.query(
    `INSERT INTO schedules (user_id, judul, kategori, waktu, catatan, ulangi, tanggal, hari)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [req.userId, judul, kategori, waktu, catatan, ulangi, tanggal, hari]
  );

  res.status(201).json({
    pesan: 'Jadwal disimpan.',
    jadwal: { id: hasil.insertId, judul: judul, kategori: kategori, waktu: rapikanWaktu(waktu), catatan: catatan || '', ulangi: ulangi, tanggal: tanggal, hari: hari, selesai: false }
  });
});

// ---------- PUT /api/jadwal/:id/selesai  -> tandai selesai / batal (hari ini) ----------
router.put('/jadwal/:id/selesai', wajibLogin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ pesan: 'Jadwal tidak valid.' });

  const [ada] = await db.query('SELECT id FROM schedules WHERE id = ? AND user_id = ?', [id, req.userId]);
  if (!ada.length) return res.status(404).json({ pesan: 'Jadwal tidak ditemukan.' });

  if (req.body.selesai) {
    await db.query(
      'INSERT IGNORE INTO schedule_done (user_id, schedule_id, tanggal) VALUES (?, ?, CURDATE())',
      [req.userId, id]
    );
  } else {
    await db.query(
      'DELETE FROM schedule_done WHERE user_id = ? AND schedule_id = ? AND tanggal = CURDATE()',
      [req.userId, id]
    );
  }
  res.json({ pesan: 'Tersimpan.' });
});

// ---------- DELETE /api/jadwal/:id  -> hapus jadwal ----------
router.delete('/jadwal/:id', wajibLogin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ pesan: 'Jadwal tidak valid.' });
  await db.query('DELETE FROM schedules WHERE id = ? AND user_id = ?', [id, req.userId]);
  res.json({ pesan: 'Jadwal dihapus.' });
});

module.exports = router;
