// Chat dengan Dokter AI (hanya untuk pengguna yang login).
// Pengguna tinggal mengirim pesan; API key & pengaturan AI diatur admin dan tidak pernah dikirim ke browser.
const express = require('express');
const rateLimit = require('express-rate-limit');
const db = require('../db');
const { wajibLogin } = require('../middleware');
const { ambilPengaturan, panggilAI } = require('../chatbot-ai');

const router = express.Router();

// Maksimal 15 pesan per menit per pengguna (menjaga biaya & penyalahgunaan)
const batasKirim = rateLimit({
  windowMs: 60 * 1000,
  limit: 15,
  keyGenerator: function (req) { return 'user-' + req.userId; },
  message: { pesan: 'Terlalu cepat. Tunggu sebentar lalu coba lagi.' }
});

// GET /api/chat  -> 50 pesan terakhir (terlama dulu) + apakah chatbot aktif
router.get('/', wajibLogin, async (req, res) => {
  const [rows] = await db.query(
    'SELECT role, isi FROM (SELECT id, role, isi FROM chat_messages WHERE user_id = ? ORDER BY id DESC LIMIT 50) t ORDER BY id ASC',
    [req.userId]
  );
  const p = await ambilPengaturan();
  res.json({ pesan: rows, aktif: !!(p.aktif && p.api_key) });
});

// POST /api/chat/send  body: { isi }  -> kirim pesan, simpan, dan kembalikan balasan AI
router.post('/send', wajibLogin, batasKirim, async (req, res) => {
  const isi = String(req.body.isi || '').trim();
  if (!isi) return res.status(400).json({ pesan: 'Pesan tidak boleh kosong.' });
  if (isi.length > 1000) return res.status(400).json({ pesan: 'Pesan terlalu panjang (maksimal 1000 karakter).' });

  const p = await ambilPengaturan();
  // Nama pengguna dipakai agar jawaban AI terasa personal (menyapa dengan namanya)
  const [u] = await db.query('SELECT nama FROM users WHERE id = ?', [req.userId]);
  p.nama_pengguna = u.length ? String(u[0].nama).split(' ')[0] : '';
  if (!p.aktif || !p.api_key) {
    return res.status(503).json({ pesan: 'Live Chat AI belum diaktifkan oleh admin. Coba lagi nanti.' });
  }

  // Konteks percakapan: 11 pesan terakhir + pesan baru
  const [riwayat] = await db.query(
    'SELECT role, isi FROM (SELECT id, role, isi FROM chat_messages WHERE user_id = ? ORDER BY id DESC LIMIT 11) t ORDER BY id ASC',
    [req.userId]
  );
  const pesan = riwayat.map(function (r) { return { role: r.role, content: r.isi }; })
    .concat({ role: 'user', content: isi });

  let hasilAI;
  try {
    hasilAI = await panggilAI(p, pesan);
  } catch (err) {
    console.error('[Chatbot AI]', err.message); // detail hanya di log server, tidak ke pengguna
    // Bedakan penyebabnya agar pengguna tidak bingung:
    // - kuota harian model gratis habis -> akan kembali besok
    // - rate limit sementara -> tunggu beberapa menit
    const e = String(err.message || '');
    if (/429/.test(e) && /free-models-per-day|per-day|daily/i.test(e)) {
      return res.status(503).json({ pesan: 'Kuota model gratis untuk hari ini sudah habis. Chatbot akan aktif lagi besok. Sementara itu kamu masih bisa mencatat data kesehatan dan makanan di halaman Kesehatan.' });
    }
    if (/429/.test(e)) {
      return res.status(503).json({ pesan: 'Bentar ya, chatbot sedang terlalu banyak dipakai. Coba lagi dalam beberapa menit.' });
    }
    return res.status(502).json({ pesan: 'Dokter AI sedang tidak bisa menjawab. Coba lagi beberapa saat lagi.' });
  }

  const balasan = hasilAI.balasan;
  await db.query('INSERT INTO chat_messages (user_id, role, isi) VALUES (?, ?, ?)', [req.userId, 'user', isi]);
  await db.query('INSERT INTO chat_messages (user_id, role, isi) VALUES (?, ?, ?)', [req.userId, 'assistant', balasan]);
  // Catat pemakaian token (terpisah dari riwayat chat, tidak ikut terhapus saat pengguna membersihkan chat)
  const t = hasilAI.token;
  await db.query(
    'INSERT INTO chat_usage (user_id, model, prompt_tokens, completion_tokens, total_tokens) VALUES (?, ?, ?, ?, ?)',
    [req.userId, hasilAI.model || p.model, t.prompt, t.completion, t.total]
  );
  res.json({ balasan: balasan });
});

// DELETE /api/chat  -> hapus semua riwayat milik user ini
router.delete('/', wajibLogin, async (req, res) => {
  await db.query('DELETE FROM chat_messages WHERE user_id = ?', [req.userId]);
  res.json({ pesan: 'Riwayat chat dihapus.' });
});

module.exports = router;
