// Halaman admin: pengaturan Chatbot AI + statistik pemakaian (khusus akun dengan role 'admin').
// Admin TIDAK bisa membaca isi chat pengguna — hanya angka pemakaian (jumlah pertanyaan & token).
const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { wajibAdmin, angka } = require('../middleware');
const { ambilPengaturan, panggilAI } = require('../chatbot-ai');
const { PROMPT_BAWAAN } = require('../defaults');

const router = express.Router();
router.use(wajibAdmin);

// API key tidak pernah dikirim utuh ke browser — hanya 4 karakter terakhir
function tampilan(p) {
  return {
    aktif: !!p.aktif,
    base_url: p.base_url,
    model: p.model,
    ada_key: !!p.api_key,
    key_akhir: p.api_key ? p.api_key.slice(-4) : '',
    system_prompt: p.system_prompt,
    temperature: Number(p.temperature),
    max_tokens: p.max_tokens,
    prompt_bawaan: PROMPT_BAWAAN,
    diperbarui: p.updated_at
  };
}

// GET /api/admin/chatbot
router.get('/chatbot', async (req, res) => {
  res.json(tampilan(await ambilPengaturan()));
});

// PUT /api/admin/chatbot
router.put('/chatbot', async (req, res) => {
  const b = req.body;
  const baseUrl = String(b.base_url || '').trim().replace(/\/+$/, '');
  const model = String(b.model || '').trim();
  const prompt = String(b.system_prompt || '').trim();
  const temperature = angka(b.temperature, 0, 2);
  const maxTokens = angka(b.max_tokens, 50, 4000);
  const keyBaru = String(b.api_key || '').trim();

  if (!/^https?:\/\/\S+$/.test(baseUrl) || baseUrl.length > 200) return res.status(400).json({ pesan: 'Base URL harus diawali http:// atau https://.' });
  if (!model || model.length > 100) return res.status(400).json({ pesan: 'Nama model wajib diisi (maksimal 100 karakter).' });
  if (prompt.length < 10 || prompt.length > 4000) return res.status(400).json({ pesan: 'Prompt sistem harus 10–4000 karakter.' });
  if (temperature === null || Number.isNaN(temperature)) return res.status(400).json({ pesan: 'Temperature harus 0–2.' });
  if (maxTokens === null || Number.isNaN(maxTokens)) return res.status(400).json({ pesan: 'Max token harus 50–4000.' });
  if (keyBaru.length > 300) return res.status(400).json({ pesan: 'API key terlalu panjang.' });

  // Key kosong = pertahankan key lama; centang "hapus key" = kosongkan
  let key = (await ambilPengaturan()).api_key;
  if (b.hapus_key) key = '';
  else if (keyBaru) key = keyBaru;

  const aktif = b.aktif && key ? 1 : 0; // tidak bisa aktif tanpa API key
  await db.query(
    `UPDATE chatbot_settings SET aktif = ?, base_url = ?, model = ?, api_key = ?, system_prompt = ?,
       temperature = ?, max_tokens = ? WHERE id = 1`,
    [aktif, baseUrl, model, key, prompt, Math.round(temperature * 10) / 10, Math.round(maxTokens)]
  );
  res.json(tampilan(await ambilPengaturan()));
});

// POST /api/admin/chatbot/test  -> coba kirim satu pesan memakai pengaturan tersimpan
router.post('/chatbot/test', async (req, res) => {
  const p = await ambilPengaturan();
  if (!p.api_key) return res.status(400).json({ pesan: 'Isi dan simpan API key terlebih dahulu.' });
  try {
    const hasil = await panggilAI(p, [{ role: 'user', content: 'Halo, perkenalkan dirimu dalam satu kalimat.' }]);
    res.json({ balasan: hasil.balasan, token: hasil.token });
  } catch (err) {
    // Admin boleh melihat detail error dari penyedia AI untuk memperbaiki pengaturan
    res.status(502).json({ pesan: 'Gagal: ' + err.message });
  }
});

// ---------- Dashboard: ringkasan & pemakaian per pengguna ----------
// Semua angka pemakaian berasal dari tabel chat_usage (satu baris per jawaban AI),
// sehingga tetap akurat walau pengguna menghapus riwayat chat-nya.

function tanggalLokal(d) {
  const dua = function (n) { return String(n).padStart(2, '0'); };
  return d.getFullYear() + '-' + dua(d.getMonth() + 1) + '-' + dua(d.getDate());
}

// GET /api/admin/ringkasan
router.get('/ringkasan', async (req, res) => {
  // "Aktif" = membuka website (last_seen) dalam periode tertentu. Akun admin tidak dihitung.
  const [[u]] = await db.query(
    `SELECT COUNT(*) AS total,
            SUM(last_seen >= CURDATE()) AS aktif_hari_ini,
            SUM(last_seen >= NOW() - INTERVAL 7 DAY) AS aktif_7_hari,
            SUM(created_at >= NOW() - INTERVAL 7 DAY) AS baru_7_hari
       FROM users WHERE role = 'user'`
  );
  const [[c]] = await db.query(
    `SELECT COUNT(DISTINCT t.user_id) AS pengguna_chat,
            COUNT(DISTINCT CASE WHEN t.created_at >= NOW() - INTERVAL 7 DAY THEN t.user_id END) AS pengguna_chat_7_hari,
            COUNT(*) AS pesan,
            SUM(t.created_at >= CURDATE()) AS pesan_hari_ini,
            COALESCE(SUM(t.total_tokens), 0) AS token_total,
            COALESCE(SUM(CASE WHEN t.created_at >= CURDATE() THEN t.total_tokens END), 0) AS token_hari_ini,
            COALESCE(SUM(CASE WHEN t.created_at >= NOW() - INTERVAL 7 DAY THEN t.total_tokens END), 0) AS token_7_hari
       FROM chat_usage t JOIN users u ON u.id = t.user_id WHERE u.role = 'user'`
  );
  const [harian] = await db.query(
    `SELECT DATE(t.created_at) AS tanggal, COUNT(*) AS jumlah, SUM(t.total_tokens) AS token
       FROM chat_usage t JOIN users u ON u.id = t.user_id
      WHERE u.role = 'user' AND t.created_at >= CURDATE() - INTERVAL 6 DAY
      GROUP BY DATE(t.created_at)`
  );

  // Isi 7 hari terakhir (hari tanpa chat bernilai 0)
  const peta = {};
  harian.forEach(function (h) { peta[h.tanggal] = { jumlah: Number(h.jumlah), token: Number(h.token) }; });
  const grafik = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const t = tanggalLokal(d);
    grafik.push({ tanggal: t, jumlah: peta[t] ? peta[t].jumlah : 0, token: peta[t] ? peta[t].token : 0 });
  }

  const p = await ambilPengaturan();
  res.json({
    pengguna: {
      total: Number(u.total),
      aktif_hari_ini: Number(u.aktif_hari_ini || 0),
      aktif_7_hari: Number(u.aktif_7_hari || 0),
      baru_7_hari: Number(u.baru_7_hari || 0)
    },
    chatbot: {
      aktif: !!(p.aktif && p.api_key),
      model: p.model,
      pengguna_chat: Number(c.pengguna_chat),
      pengguna_chat_7_hari: Number(c.pengguna_chat_7_hari),
      pesan: Number(c.pesan || 0),
      pesan_hari_ini: Number(c.pesan_hari_ini || 0),
      token_total: Number(c.token_total),
      token_hari_ini: Number(c.token_hari_ini),
      token_7_hari: Number(c.token_7_hari)
    },
    grafik: grafik
  });
});

// GET /api/admin/pengguna  -> semua pengguna + pemakaian chatbot (tanpa isi chat)
router.get('/pengguna', async (req, res) => {
  const [rows] = await db.query(
    `SELECT u.id, u.nama, u.email, u.created_at, u.last_seen,
            COALESCE(x.pesan, 0) AS pesan,
            COALESCE(x.token_total, 0) AS token_total,
            COALESCE(x.token_7_hari, 0) AS token_7_hari,
            x.chat_terakhir
       FROM users u
       LEFT JOIN (
         SELECT user_id, COUNT(*) AS pesan, SUM(total_tokens) AS token_total,
                SUM(CASE WHEN created_at >= NOW() - INTERVAL 7 DAY THEN total_tokens END) AS token_7_hari,
                MAX(created_at) AS chat_terakhir
           FROM chat_usage GROUP BY user_id
       ) x ON x.user_id = u.id
      WHERE u.role = 'user'
      ORDER BY COALESCE(u.last_seen, u.created_at) DESC
      LIMIT 500`
  );
  res.json({
    pengguna: rows.map(function (r) {
      return Object.assign({}, r, {
        pesan: Number(r.pesan),
        token_total: Number(r.token_total),
        token_7_hari: Number(r.token_7_hari || 0)
      });
    })
  });
});

// POST /api/admin/pengguna/:id/reset-password  -> setel ulang password pengguna
// Admin TIDAK boleh mereset passwordnya sendiri lewat jalur ini:
// cookie admin yang dicuri tidak cukup untuk mengambil alih akun permanen.
router.post('/pengguna/:id/reset-password', async (req, res) => {
  const targetId = Number(req.params.id);
  const passwordBaru = String(req.body.password_baru || '');

  if (!Number.isInteger(targetId) || targetId <= 0) return res.status(400).json({ pesan: 'ID pengguna tidak valid.' });
  if (passwordBaru.length < 6 || passwordBaru.length > 72) {
    return res.status(400).json({ pesan: 'Password baru harus 6–72 karakter.' });
  }
  if (targetId === req.userId) {
    return res.status(403).json({ pesan: 'Tidak bisa mereset password sendiri. Ganti lewat menu Profil (butuh password lama).' });
  }

  const [rows] = await db.query('SELECT id, nama, email, role FROM users WHERE id = ?', [targetId]);
  if (!rows.length) return res.status(404).json({ pesan: 'Pengguna tidak ditemukan.' });
  if (rows[0].role === 'admin') return res.status(403).json({ pesan: 'Password akun admin lain tidak bisa direset dari sini.' });

  const hash = await bcrypt.hash(passwordBaru, 10);
  await db.query('UPDATE users SET password_hash = ? WHERE id = ?', [hash, targetId]);
  res.json({ pesan: 'Password ' + rows[0].nama + ' berhasil direset.' });
});

// ---------- Moderasi ulasan (testimoni) ----------
// Ulasan pengguna tidak tampil publik di beranda sebelum di-setujui di sini.
// Menolak = disembunyikan dari publik, bukan menghapus, jadi bisa dibaca lagi.

const STATUS_ULASAN = ['menunggu', 'draft', 'diterima', 'ditolak'];

// GET /api/admin/ulasan?status=menunggu|draft|diterima|ditolak
router.get('/ulasan', async (req, res) => {
  const status = String(req.query.status || '').trim();
  const cari = String(req.query.cari || '').trim().slice(0, 60);

  const syarat = [];
  const args = [];
  if (STATUS_ULASAN.indexOf(status) >= 0) { syarat.push('t.status = ?'); args.push(status); }
  if (cari) { syarat.push('(t.nama LIKE ? OR t.kota LIKE ? OR t.isi LIKE ?)'); args.push('%' + cari + '%', '%' + cari + '%', '%' + cari + '%'); }
  const where = syarat.length ? 'WHERE ' + syarat.join(' AND ') : '';

  const [rows] = await db.query(
    `SELECT t.id, t.user_id, t.nama, t.kota, t.isi, t.rating, t.status, t.created_at,
            t.ditinjau_at, a.nama AS admin_nama
       FROM testimonials t
       LEFT JOIN users a ON a.id = t.ditinjau_oleh
       ${where}
      ORDER BY FIELD(t.status, 'menunggu', 'draft', 'diterima', 'ditolak'), t.created_at DESC, t.id DESC
      LIMIT 200`,
    args
  );

  // Jumlah per status untuk angka di header tab
  const [[j]] = await db.query(
    `SELECT SUM(status = 'menunggu') AS menunggu,
            SUM(status = 'draft')    AS draft,
            SUM(status = 'diterima') AS diterima,
            SUM(status = 'ditolak')  AS ditolak,
            COUNT(*) AS total
       FROM testimonials`
  );

  res.json({
    ulasan: rows.map(function (r) {
      return Object.assign({}, r, { rating: Number(r.rating) });
    }),
    jumlah: {
      menunggu: Number(j.menunggu || 0),
      draft: Number(j.draft || 0),
      diterima: Number(j.diterima || 0),
      ditolak: Number(j.ditolak || 0),
      total: Number(j.total)
    }
  });
});

// POST /api/admin/ulasan/:id/status  body: { status: 'diterima' | 'ditolak' | 'draft' }
router.post('/ulasan/:id/status', async (req, res) => {
  const id = Number(req.params.id);
  const status = String(req.body.status || '');
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ pesan: 'ID ulasan tidak valid.' });
  if (STATUS_ULASAN.indexOf(status) < 0) return res.status(400).json({ pesan: 'Status harus "diterima", "ditolak", atau "draft".' });

  const [rows] = await db.query('SELECT id, nama FROM testimonials WHERE id = ?', [id]);
  if (!rows.length) return res.status(404).json({ pesan: 'Ulasan tidak ditemukan.' });

  await db.query(
    'UPDATE testimonials SET status = ?, ditinjau_at = NOW(), ditinjau_oleh = ? WHERE id = ?',
    [status, req.userId, id]
  );
  const PESAN_STATUS = {
    diterima: 'Ulasan disetujui dan sudah tampil di beranda.',
    ditolak: 'Ulasan ditolak dan disembunyikan dari beranda.',
    draft: 'Ulasan disimpan sebagai draft dan belum ditampilkan di beranda.'
  };
  res.json({
    pesan: PESAN_STATUS[status],
    status: status
  });
});

// DELETE /api/admin/ulasan/:id  -> hapus permanen (untuk ulasan sampah/duplikat)
router.delete('/ulasan/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ pesan: 'ID ulasan tidak valid.' });
  const [rows] = await db.query('SELECT id FROM testimonials WHERE id = ?', [id]);
  if (!rows.length) return res.status(404).json({ pesan: 'Ulasan tidak ditemukan.' });
  await db.query('DELETE FROM testimonials WHERE id = ?', [id]);
  res.json({ pesan: 'Ulasan dihapus.' });
});

// ---------- Kelola makanan (tabel gizi untuk fitur Catat Makanan) ----------
// Data ini dipakai halaman Kesehatan; admin bisa menambah, mengubah, menghapus.

function dataMakanan(m) {
  return {
    id: m.id, nama: m.nama, kategori: m.kategori,
    kcal_per_100g: Number(m.kcal_per_100g),
    gram_porsi: Number(m.gram_porsi),
    takaran: m.takaran || ''
  };
}

// Validasi masukan makanan. Mengembalikan { nilai } atau { galat }
function validasiMakanan(b) {
  const nama = String(b.nama || '').trim();
  const kategori = String(b.kategori || '').trim();
  const kcal = angka(b.kcal_per_100g, 0, 2000);
  const porsi = angka(b.gram_porsi, 1, 2000);
  const takaran = String(b.takaran || '').trim();

  if (nama.length < 2 || nama.length > 80) return { galat: 'Nama makanan harus 2–80 huruf.' };
  if (kategori.length < 2 || kategori.length > 30) return { galat: 'Kategori harus 2–30 huruf.' };
  if (kcal === null || Number.isNaN(kcal)) return { galat: 'Energi harus 0–2.000 kcal per 100 g.' };
  if (porsi === null || Number.isNaN(porsi)) return { galat: 'Berat porsi harus 1–2.000 gram.' };
  if (takaran.length > 40) return { galat: 'Keterangan takaran maksimal 40 karakter.' };
  return { nilai: { nama, kategori, kcal: Math.round(kcal), porsi: Math.round(porsi), takaran } };
}

// GET /api/admin/makanan  -> seluruh daftar makanan
router.get('/makanan', async (req, res) => {
  const [rows] = await db.query('SELECT id, nama, kategori, kcal_per_100g, gram_porsi, takaran FROM foods ORDER BY kategori, nama');
  res.json({ makanan: rows.map(dataMakanan) });
});

// POST /api/admin/makanan  -> tambah makanan baru
router.post('/makanan', async (req, res) => {
  const v = validasiMakanan(req.body);
  if (v.galat) return res.status(400).json({ pesan: v.galat });

  const [ada] = await db.query('SELECT id FROM foods WHERE nama = ?', [v.nilai.nama]);
  if (ada.length) return res.status(409).json({ pesan: 'Makanan dengan nama itu sudah ada.' });

  const [hasil] = await db.query(
    'INSERT INTO foods (nama, kategori, kcal_per_100g, gram_porsi, takaran) VALUES (?, ?, ?, ?, ?)',
    [v.nilai.nama, v.nilai.kategori, v.nilai.kcal, v.nilai.porsi, v.nilai.takaran]
  );
  const [[baru]] = await db.query('SELECT id, nama, kategori, kcal_per_100g, gram_porsi, takaran FROM foods WHERE id = ?', [hasil.insertId]);
  res.status(201).json({ pesan: 'Makanan ditambahkan.', makanan: dataMakanan(baru) });
});

// PUT /api/admin/makanan/:id  -> ubah makanan
router.put('/makanan/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ pesan: 'ID makanan tidak valid.' });
  const v = validasiMakanan(req.body);
  if (v.galat) return res.status(400).json({ pesan: v.galat });

  const [ada] = await db.query('SELECT id FROM foods WHERE id = ?', [id]);
  if (!ada.length) return res.status(404).json({ pesan: 'Makanan tidak ditemukan.' });
  const [kembar] = await db.query('SELECT id FROM foods WHERE nama = ? AND id <> ?', [v.nilai.nama, id]);
  if (kembar.length) return res.status(409).json({ pesan: 'Makanan dengan nama itu sudah ada.' });

  await db.query(
    'UPDATE foods SET nama = ?, kategori = ?, kcal_per_100g = ?, gram_porsi = ?, takaran = ? WHERE id = ?',
    [v.nilai.nama, v.nilai.kategori, v.nilai.kcal, v.nilai.porsi, v.nilai.takaran, id]
  );
  const [[baru]] = await db.query('SELECT id, nama, kategori, kcal_per_100g, gram_porsi, takaran FROM foods WHERE id = ?', [id]);
  res.json({ pesan: 'Makanan diperbarui.', makanan: dataMakanan(baru) });
});

// DELETE /api/admin/makanan/:id  -> hapus makanan
// Catatan: catatan lama pengguna yang memakai makanan ini ikut terhapus (foreign key ON DELETE CASCADE).
router.delete('/makanan/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ pesan: 'ID makanan tidak valid.' });
  const [ada] = await db.query('SELECT id FROM foods WHERE id = ?', [id]);
  if (!ada.length) return res.status(404).json({ pesan: 'Makanan tidak ditemukan.' });
  await db.query('DELETE FROM foods WHERE id = ?', [id]);
  res.json({ pesan: 'Makanan dihapus.' });
});

module.exports = router;
