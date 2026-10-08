# AI Daily Healthy Assistant

> **Slogan:** _"Sehatkan Hidupmu, Sehatkan Masa Depanmu"_

Asisten kesehatan harian berbasis web untuk memantau kondisi tubuh, menjaga kebiasaan sehat,
mengatur jadwal & pengingat kegiatan, serta berkonsultasi lewat **chat bot AI**.

🌐 **Versi online:** [https://aihealthy.ratuzahirah.my.id/](https://aihealthy.ratuzahirah.my.id/)

## Fitur utama

- **Daftar & Masuk** — akun aman (password bcrypt, login cookie JWT `httpOnly`).
- **Dashboard kesehatan** — BMI, asupan air, langkah, tidur, kalori, detak jantung, kalori masuk.
- **Catat data harian** & **kalkulator BMI** tersimpan di database.
- **Catat makanan** dari tabel gizi lokal (tanpa AI).
- **Maintain harian** — 7 kebiasaan sehat dengan ceklis per hari.
- **Jadwal Hari Ini** — pengingat kegiatan (sekali / harian / mingguan), ceklis selesai, dan notifikasi browser.
- **Chat bot AI** "Dokter AI Sehat" — API key diatur admin di server (tidak pernah dikirim ke browser).
- **Dashboard admin** — statistik, pemakaian token, moderasi ulasan, pengaturan chatbot.
- **Mode gelap/terang** & **tampilan responsif** (desktop & mobile).

## Teknologi

- **Backend:** Node.js, Express, MySQL (mysql2), JWT (cookie), bcrypt, express-rate-limit
- **Frontend:** HTML + CSS + JavaScript murni, Chart.js, Font Awesome, Google Fonts (Poppins)

## Menjalankan (Windows + XAMPP)

1. Nyalakan **MySQL** di XAMPP Control Panel.
2. Di folder proyek:

   ```bash
   npm install     # sekali saja
   npm run setup   # sekali saja: buat database + tabel
   npm start       # jalankan website
   ```

3. Buka [http://localhost:3000](http://localhost:3000).

> Salin `.env.example` menjadi `.env` lalu isi `JWT_SECRET` dan kredensial database bila perlu.
> File `.env` **tidak** ikut ke repository (sudah masuk `.gitignore`).

## Struktur singkat

```
├── server.js        # Server Express (halaman + API)
├── db.js            # Koneksi MySQL
├── middleware.js    # Cek login (JWT) & validasi
├── schema.sql       # Skema database
├── routes/          # API: auth, health, jadwal, chat, admin, public
├── js/              # Skrip per halaman
├── css/             # Gaya (style, pages, auth, chatbot)
├── pages/           # Halaman: kesehatan, jadwal, chatbot, tentang, masuk, daftar, profil, admin
└── index.html       # Beranda
```

Dokumentasi lengkap (fitur, API, tabel database, cara menambah admin, dll.) ada di
[**DOKUMENTASI.md**](DOKUMENTASI.md).

---

© 2026 AI Daily Healthy Assistant — _"Sehatkan Hidupmu, Sehatkan Masa Depanmu."_
