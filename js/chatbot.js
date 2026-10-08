/* ==========================================================================
   AI Daily Healthy Assistant — Chat dengan Dokter AI (wajib login)
   - Pengaturan AI (API key, model, prompt) diatur admin di server,
     jadi tidak ada API key di browser.
   - Riwayat chat tersimpan di database dan dimuat ulang saat halaman dibuka.
   ========================================================================== */
(function () {
  'use strict';

  const liveArea = document.getElementById('liveArea');
  const liveTyping = document.getElementById('liveTyping');
  const msgForm = document.getElementById('msgForm');
  const msgInput = document.getElementById('msgInput');
  const sendBtn = document.getElementById('sendBtn');
  const clearChatBtn = document.getElementById('clearChatBtn');
  const areaInput = document.getElementById('areaInput');
  const areaLogin = document.getElementById('areaLogin');

  if (!msgForm) return; // bukan di halaman chatbot

  // Versi lama menyimpan API key pengguna di browser — hapus jejaknya
  try { localStorage.removeItem('aihealthy_openai_compat'); } catch (e) {}

  // ---- saat halaman dibuka: cek login ----
  App.ready.then(function (user) {
    if (!user) { // tamu: tidak ada kolom chat, hanya ajakan masuk
      areaLogin.hidden = false;
      addMsg('bot', 'Halo! Saya HEALTH GUARDIAN. Silakan masuk atau daftar dulu agar kita bisa mulai ngobrol dan riwayatmu tersimpan.');
      return;
    }
    areaInput.hidden = false;
    clearChatBtn.hidden = false;

    App.api('/api/chat').then(function (d) {
      if (d.pesan.length) {
        d.pesan.forEach(function (p) { addMsg(p.role === 'user' ? 'user' : 'bot', p.isi); });
      } else {
        const jam = new Date().getHours();
        const sapaan = jam < 11 ? 'Selamat pagi' : (jam < 15 ? 'Selamat siang' : (jam < 18 ? 'Selamat sore' : 'Selamat malam'));
        addMsg('bot', sapaan + ', ' + user.nama.split(' ')[0] + '! 👋 Saya HEALTH GUARDIAN, asisten kesehatan pribadimu. Tanyakan saja seputar nutrisi, olahraga, tidur, hidrasi, atau kesehatan mental — atau pilih topik cepat di samping.');
      }
      if (!d.aktif) addMsg('bot', 'Catatan: Live Chat AI sedang belum diaktifkan oleh admin, jadi pertanyaanmu belum bisa dijawab. Coba lagi nanti ya.');
    }).catch(function (err) { addMsg('bot', err.message); });
  });

  // ---- kirim pesan ----
  msgForm.addEventListener('submit', function (ev) {
    ev.preventDefault();
    kirim(msgInput.value);
  });

  // ---- topik cepat & saran: klik langsung mengirim pertanyaan ----
  document.querySelectorAll('[data-q]').forEach(function (tombol) {
    tombol.addEventListener('click', function () {
      if (!App.user) {
        window.location.href = '/pages/masuk';
        return;
      }
      kirim(tombol.getAttribute('data-q'));
    });
  });

  async function kirim(teks) {
    const text = teks.trim();
    if (!text || !App.user || sendBtn.disabled) return;

    addMsg('user', text);
    msgInput.value = '';
    setSending(true);
    try {
      const d = await App.api('/api/chat/send', 'POST', { isi: text });
      addMsg('bot', d.balasan);
    } catch (err) {
      addMsg('bot', err.message);
    }
    setSending(false);
  }

  // ---- hapus riwayat chat (di layar & di database) ----
  clearChatBtn.addEventListener('click', async function () {
    // hapus hanya gelembung pesan (indikator mengetik harus tetap ada)
    liveArea.querySelectorAll('.msg').forEach(function (m) { m.remove(); });
    try { await App.api('/api/chat', 'DELETE'); } catch (e) {}
    addMsg('bot', 'Riwayat chat dibersihkan. Ada yang bisa saya bantu?');
  });

  // ---- helpers UI ----
  function addMsg(who, text) {
    const div = document.createElement('div');
    div.className = 'msg ' + (who === 'user' ? 'user' : 'bot live-msg');
    // Pesan pengguna: textContent. Balasan AI: di-escape lalu **tebal** diformat (aman dari injeksi HTML)
    if (who === 'user') div.textContent = text;
    else div.innerHTML = App.formatTeks(text);
    liveArea.insertBefore(div, liveTyping);
    liveArea.scrollTop = liveArea.scrollHeight;
  }

  function setSending(sending) {
    liveTyping.style.display = sending ? 'inline-flex' : 'none';
    sendBtn.disabled = sending;
    msgInput.disabled = sending;
    if (sending) liveArea.scrollTop = liveArea.scrollHeight;
    else msgInput.focus();
  }
})();
