// Menghubungi layanan AI (endpoint gaya OpenAI /chat/completions).
// Pengaturannya (API key, model, prompt) diambil dari tabel chatbot_settings yang diatur admin.
const db = require('./db');

async function ambilPengaturan() {
  const [rows] = await db.query('SELECT * FROM chatbot_settings WHERE id = 1');
  const p = rows[0];
  // Daftar cadangan disesuaikan dengan penyedia (base_url) yang sedang dipakai.
  // Fallback dipakai bila model utama error / jawabannya kosong.
  p.model_cadangan = daftarCadangan(p.base_url);
  return p;
}

// Model cadangan per penyedia (nama model berbeda-beda di tiap provider)
function daftarCadangan(baseUrl) {
  const url = String(baseUrl || '').toLowerCase();
  if (url.indexOf('groq.com') >= 0) {
    return ['openai/gpt-oss-20b', 'qwen/qwen3.8-27b'];
  }
  if (url.indexOf('openrouter.ai') >= 0) {
    return [
      'nvidia/nemotron-3-super-120b-a12b:free',
      'nvidia/nemotron-3.5-lightning:free',
      'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free'
    ];
  }
  // Penyedia lain (OpenAI, Gemini, Ollama, dll.): tidak ada cadangan bawaan
  return [];
}

// Perkiraan kasar (± 4 karakter = 1 token) bila penyedia AI tidak melaporkan pemakaian token
function perkirakanToken(teks) {
  return Math.ceil(String(teks).length / 4);
}

// Model reasoning (mis. nemotron) butuh 13–30+ detik per jawaban, apalagi bila riwayat
// percakapan panjang. Batas waktunya dibuat longgar agar request tidak dibatalkan
// di tengah jalan (dulu 30 detik -> sering berakhir "tidak bisa menjawab").
const BATAS_WAKTU_MS = 120000;

// Susun prompt sistem: prompt dari admin + nama pengguna agar sapaannya personal
function promptSistem(p) {
  let teks = String(p.system_prompt || '');
  if (p.nama_pengguna) {
    teks += '\n\nPENGGUNA SAAT INI: ' + p.nama_pengguna +
      '. Sapa dia dengan namanya secara natural di awal balasan (jangan ulangi di setiap paragraf).';
  }
  return teks;
}

// Kirim satu request ke penyedia AI. Mengembalikan objek JSON mentah.
async function kirimPermintaan(p, pesan, batasToken) {
  const res = await fetch(p.base_url.replace(/\/+$/, '') + '/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + p.api_key
    },
    body: JSON.stringify({
      model: p.model,
      messages: [{ role: 'system', content: promptSistem(p) }].concat(pesan),
      temperature: Number(p.temperature),
      max_tokens: batasToken
    }),
    signal: AbortSignal.timeout(BATAS_WAKTU_MS)
  });

  if (!res.ok) {
    const teks = await res.text();
    let detail = teks;
    try { detail = (JSON.parse(teks).error || {}).message || teks; } catch (e) {}
    throw new Error('HTTP ' + res.status + ' — ' + String(detail).slice(0, 200));
  }

  const data = await res.json();
  if (!data || !data.choices || !data.choices[0]) {
    // Penyedia mengirim body berisi error dengan status 200 (sering terjadi pada model free)
    const pesanError = data && data.error && (data.error.message || data.error.code);
    throw new Error(pesanError ? String(pesanError).slice(0, 200) : 'Respons tidak dikenali dari penyedia AI.');
  }
  return data;
}

// Jeda singkat sebelum mencoba ulang (memberi waktu bila rate limit)
function jeda(ms) {
  return new Promise(function (r) { setTimeout(r, ms); });
}

// Coba kirim ke SATU model, dengan 1 kali percobaan ulang bila gagal sejenak
// (rate limit HTTP 429, error server 5xx, atau koneksi terputus).
async function cobaSekali(p, model, pesan, batasToken) {
  let terakhir = null;
  for (let percobaan = 0; percobaan < 2; percobaan++) {
    try {
      return await kirimPermintaan(Object.assign({}, p, { model: model }), pesan, batasToken);
    } catch (err) {
      terakhir = err;
      const pesanErr = String(err.message || '');
      const bisaUlang = /HTTP 429|HTTP 5\d\d|did not respond|aborted|fetch|timeout/i.test(pesanErr);
      if (!bisaUlang || percobaan === 1) throw err;
      await jeda(1500);
    }
  }
  throw terakhir;
}

// pesan = [{ role: 'user' | 'assistant', content: '...' }, ...]
// Mengembalikan { balasan, token: { prompt, completion, total }, model }
async function panggilAI(p, pesan) {
  let data = null;
  let balasan = '';
  let modelDipakai = p.model;
  let errorTerakhir = null;

  // 1) Model utama (mis. nemotron)
  try {
    data = await cobaSekali(p, p.model, pesan, p.max_tokens);
    balasan = String((data.choices[0].message || {}).content || '').trim();

    // 1b) Bila konten kosong (token "berpikir" menghabiskan max_tokens), ulangi
    if (!balasan) {
      const data2 = await cobaSekali(p, p.model, pesan, 4096);
      balasan = String((data2.choices[0].message || {}).content || '').trim();
      if (balasan) data = data2;
    }
  } catch (err) {
    errorTerakhir = err;
  }

  // 2) Fallback: model cadangan free dari OpenRouter (supaya tetap menjawab)
  if (!balasan && Array.isArray(p.model_cadangan)) {
    for (const cadangan of p.model_cadangan) {
      try {
        const data3 = await cobaSekali(p, cadangan, pesan, p.max_tokens);
        const b3 = String((data3.choices[0].message || {}).content || '').trim();
        if (b3) {
          balasan = b3;
          data = data3;
          modelDipakai = cadangan;
          errorTerakhir = null;
          break;
        }
      } catch (err2) {
        errorTerakhir = err2;
      }
    }
  }

  // Semua cara gagal -> lemparkan error terakhir supaya route bisa merespons 502
  if (!balasan && errorTerakhir) throw errorTerakhir;
  if (!balasan) balasan = '(Model tidak mengembalikan jawaban.)';

  // Pemakaian token dilaporkan penyedia AI di field "usage" (sudah termasuk token "berpikir" model reasoning)
  const u = (data && data.usage) || {};
  let prompt = Number(u.prompt_tokens);
  let completion = Number(u.completion_tokens);
  if (!Number.isFinite(prompt) || !Number.isFinite(completion)) {
    const masukan = p.system_prompt + pesan.map(function (m) { return m.content; }).join('');
    prompt = perkirakanToken(masukan);
    completion = perkirakanToken(balasan);
  }
  return { balasan: balasan, token: { prompt: prompt, completion: completion, total: prompt + completion }, model: modelDipakai };
}

module.exports = { ambilPengaturan, panggilAI };
