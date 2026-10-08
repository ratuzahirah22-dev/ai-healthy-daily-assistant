# AI Daily Healthy Assistant

> **Slogan:** *"Sehatkan Hidupmu, Sehatkan Masa Depanmu"*

Asisten kesehatan harian berbasis web yang membantu pengguna memanajemen kesehatan:
memantau kondisi tubuh, menjaga kebiasaan sehat, mendapatkan rekomendasi makanan &amp;
olahraga, serta berkonsultasi melalui **chat bot**.

**Versi 2.0 — terhubung database MySQL.** Tampilan tetap sama seperti versi awal
(HTML + CSS), ditambah JavaScript sederhana dan server **Node.js (Express)** agar
fitur **Daftar, Masuk, dan seluruh data kesehatan tersimpan dinamis di MySQL**.

🌐 **Versi online resmi:** [**https://aihealthy.ratuzahirah.my.id/**](https://aihealthy.ratuzahirah.my.id/)

---

## Versi 2.0 — Database &amp; Akun (BACA INI DULU)

### Yang baru


| Fitur                              | Keterangan                                                                                                                                                                                                                                                                                    |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Daftar &amp; Masuk**             | `pages/daftar.html`, `pages/masuk.html`. Password disimpan terenkripsi (bcrypt), login memakai cookie `httpOnly` (JWT).                                                                                                                                                                       |
| **Dashboard dinamis**              | 6 kartu pantauan (BMI, air, langkah, tidur, kalori, detak jantung) diambil dari database.                                                                                                                                                                                                     |
| **Catat data harian**              | Form "Catat Data Hari Ini" + tabel **riwayat 7 hari.**                                                                                                                                                                                                                                        |
| **Target personal (umur & gender)** | Kolom `tanggal_lahir` + `jenis_kelamin` di `users`; server (`kebutuhan.js`) menghitung target air, kalori, langkah, dan tidur sesuai umur/gender, lalu halaman Kesehatan memakainya untuk progress bar & catatan.                                                                             |
| **Kalkulator BMI sungguhan**       | Menghitung otomatis; hasilnya tersimpan jika sudah login.                                                                                                                                                                                                                                     |
| **Maintain harian tersimpan**      | Centang kebiasaan tersimpan per pengguna per hari, skor dihitung otomatis.                                                                                                                                                                                                                    |
| **Dashboard admin**                | `pages/admin.html` dengan 5 tab: **Ringkasan** (total pengguna, aktif hari ini / 7 hari, pengguna chatbot, jumlah pertanyaan, **token terpakai**, grafik 7 hari), **Pengguna &amp; Pemakaian** (pertanyaan dan token per pengguna), **Ulasan**, **Makanan** (kelola tabel gizi), **Pengaturan Chatbot**. Admin **tidak** melihat isi chat. |
| **Chat wajib login**               | Satu form chat di `pages/chatbot.html`; tamu hanya melihat ajakan masuk. Topik cepat langsung mengirim pertanyaan.                                                                                                                                                                            |
| **Chatbot AI diatur admin**        | `pages/admin.html`: admin mengisi API key, model, prompt, lalu mengaktifkan chatbot. Pengguna cukup login dan langsung chat, tanpa API key.                                                                                                                                                   |
| **Riwayat chat tersimpan**         | Live Chat AI menyimpan percakapan pengguna yang login.                                                                                                                                                                                                                                        |
| **Statistik &amp; testimoni asli** | Angka di beranda dihitung dari database; pengguna login bisa menulis ulasan.                                                                                                                                                                                                                  |
| **Newsletter**                     | Email pelanggan tersimpan di database.                                                                                                                                                                                                                                                        |
| **Mode Gelap / Terang**            | Tombol di navbar menyimpan pilihan di `localStorage`; tema gelap diperbaiki di seluruh halaman (chat, kesehatan, admin) — semua warna memakai variabel CSS `:root` / `[data-theme="dark"]`.                                                                                                     |
| **Grafik perkembangan 7 hari**     | Halaman Kesehatan menampilkan grafik Chart.js (langkah, tidur, kalori) dari riwayat database.                                                                                                                                                                              |
| **Pengingat minum air**            | Tombol di halaman Kesehatan memicu Notification browser tiap 1 jam (perlu izin; pengingat tidak disimpan ke database).                                                                                                                                                    |
| **Reset password pengguna**        | Admin dapat menyetel ulang password pengguna dari tab **Pengguna &amp; Pemakaian** (`POST /api/admin/pengguna/:id/reset-password`). Admin tidak bisa mereset passwordnya sendiri lewat jalur ini.                                                                          |
| **Jadwal Hari Ini**                | `pages/jadwal.html`. Pengingat & jadwal kegiatan pengguna: **sekali**, **setiap hari**, atau **mingguan**. Ada ringkasan (total / selesai / belum / berikutnya), timeline hari ini, daftar jadwal mendatang, dan **pengingat notifikasi browser** saat waktunya tiba. Wajib login. |


Pengunjung yang **belum login** tidak melihat angka apa pun di dashboard Kesehatan — hanya ajakan
masuk/daftar. Bagian Rekomendasi Makanan, Jadwal Olahraga, dan Tips Tidur tetap terbuka untuk semua.
Chat Bot juga wajib login.  
  
Download Xampp : [https://drive.google.com/file/d/1rcPPfG6RGtCo5KVwALnZbd\_NlgzVWQCP/view?usp=sharing](https://drive.google.com/file/d/1rcPPfG6RGtCo5KVwALnZbd_NlgzVWQCP/view?usp=sharing)

### Cara menjalankan (Windows + XAMPP)

1. Buka **XAMPP Control Panel** → klik **Start** pada **MySQL**.
2. Buka terminal di folder proyek, lalu:
   ```
    npm install          # sekali saja: unduh library
    npm run setup        # sekali saja: buat database `ai_healthy` + semua tabel
    npm start            # jalankan website
   ```
3. Buka [**http://localhost:3000**](http://localhost:3000) di browser.

### Membuat akun admin

Akun yang mendaftar lewat halaman **Daftar** selalu berperan **pengguna biasa**. Untuk membuat admin:

1. Buka http://localhost:3000/pages/daftar.html lalu daftar seperti biasa.
2. Buka **phpMyAdmin** (http://localhost/phpmyadmin) → database `ai_healthy` → tab **SQL**, jalankan
   (ganti emailnya dengan email yang tadi kamu daftarkan):
   ```sql
   UPDATE users SET role = 'admin' WHERE email = 'emailmu@contoh.com';
   ```
3. Keluar lalu masuk lagi. Menu **Admin** akan muncul di navbar.

**Alternatif — lewat skrip (otomatis membuat akun admin):**
```
node buat-admin.js
```
Skrip ini membaca `ADMIN_PASSWORD` dari `.env`, meng-hash-nya, lalu membuat akun
`admin-ratu@gmail.com` (atau mempromosikan akun lain) dengan role `admin`.
Hapus file `buat-admin.js` setelah akun dibuat agar tidak bisa dipakai ulang.

### Mengaktifkan Chatbot AI (oleh admin)

1. Masuk sebagai admin → menu **Admin**.
2. Isi **API Key** (OpenAI / OpenRouter / Groq / dll.), **Base URL**, dan **Model**.
3. Centang **Aktifkan Live Chat AI** → **Simpan Pengaturan** → klik **Tes Koneksi**.

Pengguna kemudian cukup masuk dan chat di halaman **Chat Bot**. API key disimpan di
database dan dipakai oleh server saja — **tidak pernah dikirim ke browser**
(admin hanya melihat 4 karakter terakhirnya). Pengguna dibatasi 15 pesan per menit.

Pengaturan database ada di file **`.env`** (salin dari `.env.example` bila belum ada):
`DB_USER=root`, `DB_PASSWORD=` (kosong, bawaan XAMPP), `DB_NAME=ai_healthy`,
`JWT_SECRET=` (teks acak rahasia — **jangan dibagikan**, file `.env` tidak ikut di-upload).

> Website **tidak bisa dibuka lagi lewat double-klik `index.html`** karena sekarang
> membutuhkan server. Selalu jalankan `npm start` dulu.

### Struktur tambahan

```
├── server.js          # Server Express: menyajikan halaman + API
├── db.js              # Koneksi ke MySQL
├── middleware.js      # Cek login (cookie JWT) & validasi angka
├── schema.sql         # Definisi database & tabel
├── setup-db.js        # Menjalankan schema.sql (npm run setup)
├── routes/
│   ├── auth.js        # Daftar, masuk, keluar, cek user
│   ├── health.js      # Dashboard, data harian, BMI, kebiasaan
│   ├── chat.js        # Kirim pesan ke AI + riwayat chat
│   ├── admin.js       # Pengaturan Chatbot AI + statistik + reset password user
│   ├── jadwal.js      # Jadwal & pengingat kegiatan pengguna (halaman Jadwal Hari Ini)
│   └── public.js      # Statistik, testimoni, newsletter
├── chatbot-ai.js      # Menghubungi layanan AI memakai pengaturan dari admin
├── kebutuhan.js       # Target personal harian (air, kalori, langkah, tidur) berdasar umur & gender
├── defaults.js        # Prompt bawaan HEALTH GUARDIAN
├── js/
│   ├── auth.js        # Fungsi bersama + menu Masuk/Daftar/Keluar & foto profil di navbar
│   ├── form-akun.js   # Form daftar & masuk
│   ├── kesehatan.js   # Dashboard kesehatan dinamis
│   ├── jadwal.js      # Halaman Jadwal Hari Ini (tambah/hapus, ceklis, pengingat)
│   ├── beranda.js     # Statistik, testimoni, newsletter
│   └── chatbot.js     # (sudah ada) + simpan riwayat ke database
├── css/auth.css       # Gaya halaman daftar/masuk & komponen baru
└── pages/daftar.html, pages/masuk.html, pages/jadwal.html
```

### Tabel database (`ai_healthy`)


| Tabel              | Isi                                                                                                                                                            |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `users`            | Akun: nama, email, password (hash), role (`user`/`admin`), `last_seen` (terakhir membuka website, dasar hitungan pengguna aktif), jenis kelamin, tinggi, berat |
| `health_logs`      | Catatan harian: air, langkah, tidur, kalori, detak jantung (1 baris/hari/user)                                                                                 |
| `bmi_records`      | Riwayat hitung BMI                                                                                                                                             |
| `habits`           | 7 kebiasaan sehat (data tetap)                                                                                                                                 |
| `habit_logs`       | Kebiasaan yang dicentang per hari                                                                                                                              |
| `chat_messages`    | Riwayat chat Dokter AI                                                                                                                                         |
| `chat_usage`       | Pemakaian token per jawaban AI (user, model, token prompt/jawaban/total). Terpisah dari riwayat chat, jadi tetap tercatat walau pengguna menghapus chat-nya    |
| `chatbot_settings` | Pengaturan Chatbot AI dari admin (API key, model, prompt, aktif/nonaktif)                                                                                      |
| `foods`            | Tabel makanan lokal (nama, kategori, kcal per 100 g, **berat porsi `gram_porsi`**, takaran lazim). Dikelola admin lewat tab **Makanan**; bukan AI — dipakai fitur Catat Makanan |
| `food_logs`        | Catatan makanan yang dimakan pengguna per hari (user, makanan, tanggal, jumlah gram)                                                                           |
| `testimonials`     | Ulasan pengguna (1 per pengguna) dengan status moderasi: `menunggu` / `draft` / `diterima` / `ditolak`. Hanya `diterima` yang tampil publik di beranda                     |
| `subscribers`      | Email newsletter                                                                                                                                               |
| `schedules`        | Jadwal/pengingat kegiatan pengguna (judul, kategori, waktu, catatan, ulangi: `sekali`/`harian`/`mingguan`, tanggal, hari)                                      |
| `schedule_done`    | Tanda jadwal yang sudah dikerjakan **per hari** (mirip `habit_logs`), jadi jadwal harian bisa dichecklist ulang tiap hari                                      |


### Daftar API


| Method &amp; alamat                       | Login? | Fungsi                                                                       |
| ----------------------------------------- | ------ | ---------------------------------------------------------------------------- |
| `POST /api/auth/register`                 | –      | Buat akun                                                                    |
| `POST /api/auth/login`                    | –      | Masuk                                                                        |
| `POST /api/auth/logout`                   | –      | Keluar                                                                       |
| `GET /api/auth/me`                        | –      | Siapa yang login                                                             |
| `GET /api/dashboard`                      | ✔      | Semua data halaman Kesehatan                                                 |
| `PUT /api/health/today`                   | ✔      | Simpan data hari ini                                                         |
| `POST /api/bmi`                           | ✔      | Hitung &amp; simpan BMI                                                      |
| `PUT /api/habits/:id`                     | ✔      | Centang / batal centang kebiasaan                                            |
| `GET /api/makanan`                        | ✔      | Daftar makanan + kcal per 100 g + berat porsi (tabel lokal, tanpa AI)        |
| `POST /api/makanan`                       | ✔      | Catat makanan dimakan (body: `makanan_id`, `jumlah_gram`)                    |
| `DELETE /api/makanan/:id`                 | ✔      | Hapus satu catatan makanan hari ini                                          |
| `GET /api/admin/makanan`                  | admin  | Daftar seluruh makanan (tabel gizi)                                          |
| `POST /api/admin/makanan`                 | admin  | Tambah makanan (nama, kategori, kcal/100 g, berat porsi, takaran)            |
| `PUT /api/admin/makanan/:id`              | admin  | Ubah makanan                                                                 |
| `DELETE /api/admin/makanan/:id`           | admin  | Hapus makanan (catatan lama yang memakainya ikut terhapus)                   |
| `GET /api/jadwal`                         | ✔      | Jadwal hari ini + daftar jadwal sekali yang akan datang                      |
| `POST /api/jadwal`                        | ✔      | Tambah jadwal (judul, waktu, kategori, ulangi, tanggal/hari)                 |
| `PUT /api/jadwal/:id/selesai`             | ✔      | Tandai selesai / batal untuk hari ini                                        |
| `DELETE /api/jadwal/:id`                  | ✔      | Hapus jadwal                                                                 |
| `GET /api/chat`, `DELETE /api/chat`       | ✔      | Baca / hapus riwayat chat                                                    |
| `POST /api/chat/send`                     | ✔      | Kirim pesan, server menghubungi AI dan menyimpan percakapan                  |
| `GET /api/admin/ringkasan`                | admin  | Statistik pengguna, pengguna aktif, pemakaian chatbot, grafik 7 hari         |
| `GET /api/admin/pengguna`                 | admin  | Daftar pengguna + pemakaian chatbot (pertanyaan &amp; token), tanpa isi chat |
| `POST /api/admin/pengguna/:id/reset-password` | admin | Setel ulang password pengguna (bukan dirinya sendiri, bukan admin lain)     |
| `GET /api/admin/ulasan`                   | admin  | Daftar ulasan + jumlah per status (untuk moderasi)                           |
| `POST /api/admin/ulasan/:id/status`       | admin  | Ubah status: `diterima` / `draft` / `ditolak`                               |
| `DELETE /api/admin/ulasan/:id`            | admin  | Hapus ulasan secara permanen                                                  |
| `GET / PUT /api/admin/chatbot`            | admin  | Lihat / ubah pengaturan Chatbot AI                                           |
| `POST /api/admin/chatbot/test`            | admin  | Tes koneksi ke layanan AI                                                    |
| `GET /api/stats`, `GET /api/testimonials` | –      | Data beranda (hanya ulasan berstatus `diterima`)                             |
| `GET /api/testimonials/saya`              | ✔      | Status moderasi ulasan milik pengguna yang login                              |
| `POST /api/testimonials`                  | ✔      | Kirim ulasan (langsung berstatus `menunggu`, perlu persetujuan admin)       |
| `POST /api/newsletter`                    | –      | Daftar newsletter                                                            |


### Definisi di dashboard admin

- **Pengguna aktif** = akun pengguna biasa yang membuka website pada periode itu (hari ini / 7 hari
terakhir), dicatat lewat kolom `last_seen`. Akun admin tidak dihitung.
- **Pengguna chatbot** = pengguna yang pernah mengirim minimal satu pertanyaan ke Dokter AI.
- **Token** = pemakaian yang dilaporkan penyedia AI (field `usage`; sudah termasuk token "berpikir" model reasoning dan konteks percakapan). Bila penyedia tidak melaporkan, dihitung perkiraan ± 4 karakter = 1 token. Pemakaian sebelum fitur ini dibuat tidak tercatat.
- **Privasi:** panel admin hanya menampilkan angka pemakaian, **bukan isi percakapan**. Isi chat tetap tersimpan di tabel `chat_messages` agar pengguna melihat riwayatnya sendiri; siapa pun yang punya akses langsung ke database (mis. phpMyAdmin) secara teknis dapat membacanya, jadi akses database harus dijaga.

### Data demo (seed)

`npm run seed:demo` membuat 2 akun demo beserta riwayat 14 hari terakhir, lalu aman dijalankan
berulang (akun diperbarui, riwayat tidak diduplikasi).

| Email          | Password     | Profil                        |
| -------------- | ------------ | ----------------------------- |
| `andi@demo.id` | `Demo#12345` | Andi Pratama, L, 172 cm, 78,5 kg (BMI turun 78,5 → 74,3) |
| `siti@demo.id` | `Demo#12345` | Siti Nurhaliza, P, 160 cm, 52,3 kg (BMI 20,4 → 19,7)   |

Setiap akun diisi: `health_logs` 14 hari, `habit_logs` sesuai target yang hari itu, `bmi_records`
beberapa riwayat, `chat_messages` + `chat_usage`, dan satu `testimonials`. Ulasan Andi berstatus
`diterima` (tampil di beranda), sedangkan ulasan Siti dibiarkan `menunggu` supaya fitur moderasi
di tab Ulasan admin langsung kelihatan.

### Moderasi ulasan (testimoni)

Ulasan yang dikirim pengguna **tidak langsung tampil publik**. Alurnya:

1. Pengguna kirim ulasan lewat form di beranda → tersimpan dengan status `menunggu`.
2. Admin buka tab **Ulasan** di dashboard, saring dengan pencarian / filter status, lalu pilih salah satu:
   **Setujui** (`diterima`), **Simpan draft** (`draft`, ditahan sebagai cadangan), atau **Tolak** (`ditolak`).
3. Hanya ulasan `diterima` yang diambil `GET /api/testimonials` (3 terbaru) dan ikut menghitung
   rating rata-rata di `GET /api/stats`. Ulasan `menunggu` / `draft` / `ditolak` tidak pernah keluar
   lewat API publik.
4. Kalau pengguna mengirim ulang, ulasannya diperbarui dan statusnya kembali ke `menunggu`.
5. Di beranda, pengguna melihat status ulasannya sendiri (menunggu / ditolak / sudah tampil).

Kolom `ditinjau_at` dan `ditinjau_oleh` mencatat kapan dan oleh siapa(admin) keputusan dibuat.
Menolak tidak menghapus data, jadi bisa dibaca lagi atau dihapus permanen dari tab Ulasan.

### Keamanan yang diterapkan

- Password di-hash dengan **bcrypt**, tidak pernah disimpan apa adanya.
- Query SQL memakai **parameter (`?`)** → aman dari SQL injection.
- Teks dari pengguna di-escape sebelum ditampilkan → aman dari XSS.
- Cookie login `httpOnly` + `sameSite`; percobaan login dibatasi (rate limit).
- Hanya folder `css/`, `js/`, `pages/`, `assets/` yang bisa diakses publik;
- **Favicon & ikon:** logo merek (kotak gradien hijau→biru dengan garis detak jantung)
  dirender dari `assets/favicon.svg`. Rute `/favicon.ico`, `/favicon.svg`,
  `/apple-touch-icon.png`, dan `/manifest.webmanifest` disediakan khusus di
  `server.js` karena browser selalu meminta `/favicon.ico` di akar situs.
  Semua halaman `<head>` memuat tag `icon`, `apple-touch-icon`, `manifest`,
  dan `theme-color` sehingga ikon tampil benar di browser desktop, Android,
  dan iOS;
`.env`, `server.js`, dll. tidak terbuka.

### Catatan hosting

**Sudah online di [https://aihealthy.ratuzahirah.my.id/](https://aihealthy.ratuzahirah.my.id/)**
— dijalankan dengan server **Node.js + MySQL**. Domain ini adalah alamat publik
resmi aplikasi dan bisa dipakai untuk demo/penjurian tanpa menjalankan server lokal.

Link Cloudflare Workers lama hanya bisa menyajikan file statis, sehingga **tidak
bisa menjalankan server + MySQL ini**. Untuk online, dibutuhkan hosting yang
mendukung **Node.js + MySQL** (mis. VPS, Railway, Render + database MySQL),
dan itulah yang dipakai untuk domain publik di atas.
Untuk penjurian, versi ini aman didemokan langsung dari alamat publik tersebut
atau dari komputer lokal (`npm start`).

> **Catatan cache — penting saat memperbarui tampilan.** File `css/*.css` dan
> `js/*.js` dikirim server dengan `Cache-Control: public, max-age=14400` (4 jam),
> jadi browser bisa masih memakai salinan lama meski file di server sudah baru
> (gejala: perbaikan **tidak terlihat di HP** padahal sudah di-upload). Karena
> itu semua tautan CSS/JS di file HTML memakai **versi**: `css/style.css?v=4`,
> `js/auth.js?v=4`, dst. Halaman HTML sendiri ber-`max-age=0` (selalu dicek ulang),
> jadi **setiap kali mengubah CSS/JS, naikkan angka versinya** (mis. `?v=5`) agar
> pengunjung langsung memuat file terbaru tanpa perlu menghapus cache manual.

> Catatan: bagian-bagian di bawah ini adalah dokumentasi versi awal (HTML + CSS murni).
> Bagian "Keterbatasan" sudah teratasi di versi 2.0.

---

## Daftar Isi

- [Fitur Utama](#fitur-utama)
- [Struktur Proyek](#struktur-proyek)
- [Cara Menjalankan](#cara-menjalankan)
- [Dokumentasi Halaman](#dokumentasi-halaman)
  - [Beranda (`index.html`)](#1-beranda-indexhtml)
  - [Kesehatan (`pages/kesehatan.html`)](#2-kesehatan-pageskesehatanhtml)
  - [Chat Bot (`pages/chatbot.html`)](#3-chat-bot-pageschatbothtml)
  - [Tentang (`pages/tentang.html`)](#4-tentang-pagestentanghtml)
  - [Jadwal Hari Ini (`pages/jadwal.html`)](#5-jadwal-hari-ini-pagesjadwalhtml--jsjadwaljs)
- [Dokumentasi CSS](#dokumentasi-css)
- [Teknik CSS-Only (Tanpa JavaScript)](#teknik-css-only-tanpa-javascript)
- [Kustomisasi](#kustomisasi)
- [Keterbatasan &amp; Pengembangan Lanjutan](#keterbatasan--pengembangan-lanjutan)

---

## Fitur Utama


| #   | Fitur                                 | Lokasi                                 | Keterangan                                                                                    |
| --- | ------------------------------------- | -------------------------------------- | --------------------------------------------------------------------------------------------- |
| 1   | **Landing page** responsif            | `index.html`                           | Hero animasi, statistik, fitur, cara kerja, testimoni, CTA                                    |
| 2   | **Dashboard kesehatan**               | `pages/kesehatan.html`                 | 7 kartu pantauan (BMI, air, langkah, tidur, kalori, detak jantung, Kalori Masuk) + progress bar animasi |
| 3   | **Kalkulator BMI (tampilan)**         | `pages/kesehatan.html`                 | Form tinggi/berat + contoh hasil + skala kategori                                             |
| 4   | **Maintain harian (checklist)**       | `pages/kesehatan.html`                 | 7 kebiasaan sehat, bisa dicentang — murni CSS (`:checked`)                                    |
| 5   | **Rekomendasi makanan**               | `pages/kesehatan.html#makanan`         | Menu sarapan, makan siang, makan malam                                                        |
| 6   | **Jadwal olahraga mingguan**          | `pages/kesehatan.html#olahraga`        | Tabel Senin–Minggu + level kesulitan                                                          |
| 7   | **Tips tidur &amp; kesehatan mental** | `pages/kesehatan.html#tidur`           | 6 kartu tips + tautan ke Chat Bot                                                             |
| 8   | **Catat makanan (tanpa AI)**          | `pages/kesehatan.html`                 | 42 makanan Indonesia + nilai kcal/100 g, pilih + berat → energi dihitung di server            |
| 9   | **Live Chat AI (diatur admin)**    | `pages/chatbot.html` + `js/chatbot.js` | Hanya untuk user login; API key & model diatur admin di server, tidak pernah dikirim ke browser |
| 10  | **Halaman Tentang**                   | `pages/tentang.html`                   | Visi, misi, fitur, tim                                                                        |
| 11  | **Navigasi mobile**                   | Semua halaman                          | Hamburger menu fungsional tanpa JavaScript (≤1024px); tombol tema & hamburger dikelompokkan di kanan, foto profil tampil di sudut kanan atas saat login, menu turun tepat di bawah navbar, rapi & bisa digulir di layar kecil |
| 12  | **Jadwal & pengingat harian**         | `pages/jadwal.html`                    | Jadwal kegiatan (sekali/harian/mingguan) + ceklis selesai, ringkasan hari ini, jadwal mendatang, dan pengingat notifikasi browser |


---

## Struktur Proyek

```
ai-daily-healthy-assistant/
├── index.html              # Halaman beranda
├── DOKUMENTASI.md          # File ini
├── css/
│   ├── style.css           # Gaya utama: variabel, navbar, hero, fitur,
│   │                       #   langkah, testimoni, CTA, footer, responsif
│   ├── pages.css           # Gaya halaman: page-hero, dashboard, panel,
│   │                       #   BMI, checklist, kartu info, tabel jadwal,
│   │                       #   tips, tentang
│   └── chatbot.css         # Gaya chat: sidebar, gelembung pesan,
│                           #   jawaban topik, typing indicator, input
├── js/
│   └── chatbot.js          # Live Chat AI via server (fetch ke /api/chat, tanpa API key di browser)
│   ├── admin.js            # Dashboard admin (tab ringkasan, pengguna, pengaturan chatbot)
│   ├── theme.js            # Toggle mode gelap/terang (localStorage)
│   ├── kesehatan.js        # Dashboard kesehatan dinamis (Chart.js, pengingat)
├── pages/
│   ├── kesehatan.html      # Dashboard & maintain kesehatan
│   ├── chatbot.html        # Chat bot (Demo + Live AI)
│   └── tentang.html        # Tentang aplikasi
└── assets/                 # Ikon & favicon (logo merek)
    ├── favicon.svg             # vektor (Chrome, Edge, Firefox, Safari modern)
    ├── favicon.ico             # 16/32/48 px — fallback & bookmark lama
    ├── apple-touch-icon.png    # 180 px untuk iOS/iPadOS home screen
    ├── icon-192.png, icon-512.png  # ikon Android / PWA
    └── manifest.webmanifest    # metadata PWA (nama, warna tema, ikon)
```

---

## Cara Menjalankan

Tidak perlu instalasi apa pun. Pilih salah satu cara:

**Cara 1 — Buka langsung (termudah):**

1. Buka folder `ai-daily-healthy-assistant`.
2. Double-klik `index.html` — terbuka di browser default.

> Untuk versi 2.0 (database MySQL) wajib memakai `npm start` seperti pada
> bagian "Cara menjalankan (Windows + XAMPP)" di atas — file tidak bisa
> di-double-klik langsung.

**Cara 2 — Via VS Code:**

1. Buka folder proyek di VS Code.
2. Buka terminal di VS Code, lalu `npm start`.

**Navigasi antar halaman:**


| Dari      | Ke        | Link                                |
| --------- | --------- | ----------------------------------- |
| Beranda   | Kesehatan | Menu navbar / tombol "Mulai Pantau" |
| Beranda   | Chat Bot  | Menu navbar / tombol "Mulai Chat"   |
| Beranda   | Tentang   | Menu navbar                         |
| Kesehatan | Chat Bot  | Tombol "Konsultasi via Chat Bot"    |
| Chat Bot  | Kesehatan | Tombol "Buka Dashboard Kesehatan"   |
| Semua     | Beranda   | Logo / "← Kembali ke Beranda"       |


> Catatan: karena tanpa web server, semua link memakai path relatif
> (`pages/...`, `../index.html`, `../css/...`) sehingga tetap berfungsi
> saat dibuka sebagai file lokal.

---

## Dokumentasi Halaman

### 1. Beranda (`index.html`)

Halaman pembuka yang memperkenalkan aplikasi.


| Bagian     | Isi                                                                                                                                                                        |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Navbar     | Logo + 4 menu (Beranda, Kesehatan, Chat Bot, Tentang) + hamburger di mobile                                                                                                |
| Hero       | Badge AI, judul besar, **slogan**, deskripsi, 2 tombol CTA, 3 statistik, visual lingkaran kesehatan beranimasi (orbit ikon apel, dumbbell, bulan, air) + partikel melayang |
| Fitur      | 6 kartu: AI Chat Bot, Tracking Kesehatan, Rekomendasi Makanan, Jadwal Olahraga, Monitor Tidur, Kesehatan Mental                                                            |
| Cara Kerja | 3 langkah: Buat Akun → Input Data → Dapatkan Hasil                                                                                                                         |
| Testimoni  | 3 kartu ulasan pengguna (1 kartu unggulan/highlight)                                                                                                                       |
| CTA        | Ajakan "Siap Memulai Hidup Sehat?"                                                                                                                                         |
| Footer     | Brand, menu, fitur, newsletter, copyright + slogan                                                                                                                         |


### 2. Kesehatan (`pages/kesehatan.html`)

Pusat manajemen &amp; maintain kesehatan harian.

**a. Ringkasan Harian (7 kartu dashboard):**


| Kartu              | Nilai contoh      | Target    |
| ------------------ | ----------------- | --------- |
| Indeks Massa Tubuh | 22.4 BMI (Ideal)  | 18.5–24.9 |
| Asupan Air         | 1.5 L (6/8 gelas) | 2 liter   |
| Langkah Hari Ini   | 7.842 langkah     | 10.000    |
| Kualitas Tidur     | 7.2 jam           | 7–9 jam   |
| Kalori Terbakar    | 1.850 kcal        | ±2.200    |
| Detak Jantung      | 72 bpm            | 60–100    |
| Kalori Masuk       | hasil catat makanan | acuan 2.000 |


Setiap kartu memiliki progress bar yang terisi otomatis via animasi CSS
(`--w` custom property + `@keyframes fillBar`).

**b. Kalkulator BMI:** form tinggi (cm) &amp; berat (kg), tombol hitung,
contoh hasil (22.4 = Berat Ideal), dan skala visual 4 kategori
(Kurang / Ideal / Berlebih / Obesitas).

**b2. Target personal (umur &amp; jenis kelamin):** tanggal lahir &amp;
jenis kelamin diisi di Daftar atau Profil. Server (`kebutuhan.js`)
menghitung:
- umur (dari `tanggal_lahir`),
- target air minum (gelas) per kelompok umur &amp; gender,
- rentang tidur ideal (National Sleep Foundation),
- target langkah (anak 6.000, remaja/dewasa 10.000, lansia 7.000),
- kebutuhan kalori (Mifflin-St Jeor × 1,4; bila data kurang dipakai acuan umum).

Nilai-nilai ini dipakai halaman Kesehatan untuk progress bar dan catatan
tiap kartu (mis. “Kurang 2 gelas lagi menuju target 2 liter”), serta acuan
kartu **Kalori Masuk**. Indikator pil di bawah judul menampilkan
“Target dihitung dari umur X tahun (laki-laki/perempuan)”. Bila tanggal
lahir belum diisi, target memakai acuan umum (8 gelas, 10.000 langkah,
2.000 kcal, tidur 7–9 jam) dan pil berwarna kuning mengajak mengisi profil.

Rumus kalori (Mifflin-St Jeor, aktivitas ringan ×1,4):
- Laki-laki: `(10×kg + 6,25×cm − 5×umur + 5) × 1,4`
- Perempuan: `(10×kg + 6,25×cm − 5×umur − 161) × 1,4`

> Catatan: kategori BMI di halaman ini memakai ambang dewasa (18,5 / 25 / 30).
> Untuk pengguna di bawah 20 tahun, BMI sebaiknya dibaca dengan
> BMI-for-age persentil (belum diimplementasikan).

**c. Maintain Harian:** 7 item checklist (air putih, olahraga 30 menit,
sayur &amp; buah, tidur sebelum 23.00, 5.000+ langkah, meditasi, tanpa soda).
Item yang dicentang tercoret otomatis + skor kebiasaan (contoh: 3/7).

**d. Rekomendasi Makanan (`#makanan`):** 3 kartu menu —
Sarapan/Energi Pagi, Makan Siang/Gizi Seimbang (prinsip Isi Piringku),
Makan Malam/Ringan.

**d2. Catat Makanan (tabel gizi lokal, tanpa AI):** pengguna memilih
makanan dari daftar **42 makanan Indonesia** (5 kategori: Karbohidrat,
Protein, Sayur, Buah, Cemilan) lalu memasukkan berat dalam gram.
Pemilihan makanan memakai **combobox**: klik kolom makanan → daftar
terbuka (dikelompokkan per kategori, menampilkan kcal/100 g) → ketik
untuk menyaring langsung (nama **atau** kategori, mis. "nasi" atau
"buah"). Bisa dipilih dengan klik atau keyboard (panah atas/bawah,
Enter memilih, Esc menutup). Bila tidak ada yang cocok muncul pesan.
Pilihan disimpan di input tersembunyi `#pilihMakanan`.

**Berat otomatis (tidak bisa diubah).** Kolom berat diisi otomatis dari
`gram_porsi` makanan yang dipilih (disimpan di tabel `foods`) dan bersifat
`readonly`; server juga memakai `gram_porsi` bila berat tidak dikirim. Jadi
pengguna tidak perlu menebak beratnya.

**Berat porsi diatur admin.** Tab **Makanan** di `pages/admin.html` bisa
menambah / mengubah / menghapus makanan: nama, kategori, energi per 100 g,
**berat porsi (gram)**, dan keterangan takaran. Daftar bisa dicari, tombol
Ubah mengisi form, tombol hapus meminta konfirmasi (catatan pengguna yang
memakai makanan itu ikut terhapus karena foreign key). Perubahan langsung
berlaku di halaman Kesehatan. Database lama: `npm run setup` menambahkan
kolom `gram_porsi` dan mengisinya dari angka gram pada teks takaran.
Energi dihitung di server dengan rumus
`(kcal per 100 g × gram) / 100`. Catatan tersimpan per hari di
tabel `food_logs`, bisa dihapus per baris, dan totalnya tampil di
kartu **Kalori Masuk** serta di tabel list. Tidak ada panggilan ke
OpenRouter sama sekali, jadi **tidak memakai kuota token** dan tidak
mengganggu fitur Chatbot. Sumber angka: USDA FoodData Central &
Tabel Gizi Makanan Indonesia.

**e. Jadwal Olahraga (`#olahraga`):** tabel Senin–Minggu
(jogging, bodyweight, yoga, sepeda/renang, kekuatan, senam, istirahat)
dengan label level (Pemula/Menengah/Lanjutan/Fun/Recovery).
Acuan: minimal 150 menit aktivitas sedang per minggu (WHO).

**f. Tidur &amp; Mental (`#tidur`, `#mental`):** 6 tips —
tidur 7–9 jam, batasi kafein, meditasi, jurnal syukur,
koneksi sosial, detoks digital + tombol CTA ke Chat Bot.

### 3. Chat Bot (`pages/chatbot.html` + `js/chatbot.js`)

Konsultasi dengan **"Dokter AI Sehat"**:

**Live Chat AI (`js/chatbot.js`):**

1. Pengguna **wajib login** — tamu hanya melihat ajakan masuk.
2. Ketik pertanyaan di kolom input dan kirim.

- **Tidak ada API key di browser.** Key, model, base URL, dan prompt diatur
  admin di `pages/admin.html` dan disimpan di tabel `chatbot_settings`.
- Riwayat chat disimpan di database (`chat_messages`) dan dimuat ulang otomatis.
- Riwayat hanya dikirim ke server (11 pesan terakhir) sebagai konteks; tidak
  ada data yang dikirim langsung dari browser ke penyedia AI.
- Tombol **Bersihkan Riwayat** menghapus chat di layar dan di database.
- **Batas waktu permintaan 120 detik** (`chatbot-ai.js`). Model reasoning
  seperti `nvidia/nemotron-3-ultra-550b-a55b:free` butuh 13–65 detik per
  jawaban, apalagi dengan riwayat panjang. Batas 30 detik yang dipakai
  sebelumnya membatalkan request di tengah jalan sehingga pengguna melihat
  "Dokter AI sedang tidak bisa menjawab".
- **Percobaan ulang otomatis.** Bila jawaban kosong (model kehabisan
  `max_tokens` untuk token "berpikir"), request diulang sekali dengan
  `max_tokens: 4096`. Bila masih kosong, pengguna melihat pesan ramah
  dari server — bukan error.
- **Error dari penyedia dibaca detailnya** di log server
  (`[Chatbot AI] ...`) untuk membantu admin membedakan rate limit,
  kuota habis, atau konfigurasi yang salah. Pengguna hanya melihat pesan umum.
- **Pesan error dibedakan agar jelas:**
  - kuota harian model gratis habis (`HTTP 429 free-models-per-day`) → 503
    "Kuota model gratis untuk hari ini sudah habis, chatbot aktif lagi besok"
  - rate limit sementara (`HTTP 429`) → 503 "coba lagi beberapa menit"
  - error lain → 502 "Dokter AI sedang tidak bisa menjawab"
- **Persona AI (system prompt bawaan, `defaults.js`):** bernama
  **HEALTH GUARDIAN**, bergaya hangat-personal, **menyapa pengguna dengan
  namanya** (nama dikirim dari server lewat `nama_pengguna` pada
  `panggilAI`), dan memakai **sapaan situasional** sesuai waktu saat itu
  (pagi / siang / sore / malam) pada pesan pembuka. Tidak mengulang sapaan
  pada percakapan yang sudah berjalan.
- **Percobaan ulang otomatis** untuk error sejenak (HTTP 429, 5xx, koneksi
  putus): setiap panggilan dicoba sekali lagi setelah jeda 1,5 detik.
- **Fallback model otomatis & menyesuaikan penyedia.** Bila model utama tidak
  bisa menjawab (error atau respons kosong), server otomatis memakai model
  cadangan. Daftarnya dipilih berdasarkan `base_url` (`daftarCadangan()` di
  `chatbot-ai.js`):
  - **Groq** (`api.groq.com`) → `openai/gpt-oss-20b`, `qwen/qwen3.8-27b`
  - **OpenRouter** (`openrouter.ai`) → `nvidia/nemotron-3-super-120b-a12b:free`,
    `nvidia/nemotron-3.5-lightning:free`, `nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free`
  - Penyedia lain (OpenAI/Gemini/Ollama) → tanpa cadangan bawaan

  Model yang berhasil dipakai dicatat di `chat_usage`.
- **Bisa ganti penyedia tanpa ubah kode.** Semua provider yang kompatibel dengan
  API OpenAI (`/chat/completions`) didukung lewat halaman Admin:
  | Provider | Base URL | Contoh model |
  |---|---|---|
  | Groq | `https://api.groq.com/openai/v1` | `openai/gpt-oss-120b` |
  | OpenRouter | `https://openrouter.ai/api/v1` | `nvidia/nemotron-3-ultra-550b-a55b:free` |
  | Google Gemini | `https://generativelanguage.googleapis.com/v1beta/openai` | `gemini-2.0-flash` |
  | Ollama lokal | `http://localhost:11434/v1` | `llama3.1` |
  | OpenAI | `https://api.openai.com/v1` | `gpt-4o-mini` |

  Catatan: nama model di Groq berubah dari waktu ke waktu. Model
  `llama-3.3-70b-versatile` sudah tidak tersedia (mei 2026); gunakan
  `openai/gpt-oss-120b`. Cek daftar terbaru lewat
  `GET {base_url}/models` dengan API key yang sama.
- 5 topik cepat (Sapaan, Flu & Batuk, Diet, Olahraga, Tidur) langsung mengirim
  pertanyaan terpilih tanpa mengetik.
- Kompatibel OpenAI-Compatible: OpenAI, OpenRouter, Groq, Ollama lokal, dll.

**Topik cepat:** 5 tombol di samping langsung mengirim pertanyaan ke Live AI
(bukan jawaban statis seperti versi awal). Contohnya:


| Topik                  | Pertanyaan contoh                | Isi jawaban bot                                      |
| ---------------------- | -------------------------------- | ---------------------------------------------------- |
| Sapaan &amp; Bantuan   | "Apa saja yang bisa kamu bantu?" | Daftar kemampuan + kartu cepat                       |
| Gejala Flu &amp; Batuk | Flu, batuk, demam ringan         | Pertolongan pertama + tanda bahaya ke dokter         |
| Tips Diet Sehat        | Diet aman                        | Defisit kalori, Isi Piringku, target 0.5–1 kg/minggu |
| Olahraga Pemula        | Cocok untuk pemula               | Program 3x/minggu + rujukan jadwal                   |
| Susah Tidur            | Begadang/insomnia                | Sleep hygiene + kapan harus ke dokter                |


**Komponen UI:** profil bot + status online berdenyut, daftar topik,
area pesan (gelembung bot mengikuti tema, pengguna gradien hijau),
indikator mengetik (3 titik animasi), kolom input, baris saran cepat,
dan disclaimer medis
(*"Bukan pengganti diagnosis dokter"* — untuk keluhan serius selalu
hubungi dokter/puskesmas/IGD).

### 4. Tentang (`pages/tentang.html`)

Profil aplikasi: visual brand + slogan, paragraf latar belakang,
kartu **Visi** &amp; **Misi**, 3 kartu fitur (Chat Bot, Maintain, Responsif),
3 kartu tim (Pengembang Web, Konten Kesehatan, Desainer UI),
dan tombol CTA ke Chat Bot &amp; Dashboard.

### 5. Jadwal Hari Ini (`pages/jadwal.html` + `js/jadwal.js`)

Pengingat & jadwal kegiatan pribadi pengguna (**wajib login**).

- **Ringkasan**: total jadwal, selesai, belum, dan jadwal **berikutnya** hari ini.
- **Tambah Jadwal**: nama kegiatan, waktu, kategori (Umum, Kesehatan, Olahraga,
  Makan, Obat, Istirahat, Kerja), pilihan **ulangi** (Setiap hari / Sekali / Mingguan),
  catatan opsional. Field tanggal muncul untuk "Sekali", field hari untuk "Mingguan".
- **Daftar Jadwal Hari Ini**: berbentuk timeline berurutan waktu; tiap item bisa
  dicentang **selesai** (tercoret) dan dihapus. Jadwal yang berulang otomatis
  muncul lagi keesokan harinya (ceklist dikosongkan per hari).
- **Jadwal Mendatang**: daftar jadwal "Sekali" yang tanggalnya masih akan datang.
- **Pengingat**: tombol mengaktifkan **Notifikasi browser**; selama halaman
  terbuka, browser memberi notifikasi saat waktu jadwal tiba. Pilihan ini
  disimpan di `localStorage` dan lanjut otomatis saat halaman dibuka lagi.
- Perilaku data: jadwal `harian` selalu tampil, `sekali` tampil pada tanggalnya,
  `mingguan` tampil pada hari yang dipilih (mengikuti `DAYOFWEEK` MySQL).

---

## Dokumentasi CSS

### `css/style.css` — Gaya Utama

- **Variabel (`:root`):** warna primer hijau `#10b981`, sekunder indigo,
aksen, teks, background, 3 gradien, shadow, radius, transisi.
- **Font:** Poppins (Google Fonts) + ikon Font Awesome 6.
- **Komponen:** navbar fixed + blur, tombol pill (primary/secondary),
hero 2 kolom, partikel melayang, lingkaran kesehatan berdenyut +
4 ikon mengorbit, kartu fitur (garis gradien muncul saat hover),
langkah kerja, testimoni, CTA gradien, footer gelap.
- **Motif latar:** 4 gradien radial di `body`, grid jaring tipis
`body::before`, kabut aurora `body::after` (animasi `aurora`),
dan cincin putar di hero (`.hero::after`, animasi `putar`).
- **Animasi:** `heartbeat`, `float`, `pulse`, `orbit`, `fadeInUp`, `fadeInRight`.
- **Responsif:** breakpoint 1024px (2 kolom), 768px (1 kolom + nav mobile),
480px (kompak untuk HP kecil).
- **Navbar mobile (≤1024px):** tinggi dibuat tetap, tombol tema & hamburger
dikelompokkan di sisi kanan, dan menu ditampilkan sebagai panel penuh yang
turun tepat di bawah navbar (`top: 100%`), `max-height` + `overflow-y: auto`
saat menu panjang, dengan animasi `opacity`/`transform` dan `visibility` agar
tidak menutupi konten saat tertutup. Breakpoint dinaikkan ke 1024px supaya menu
(termasuk **Masuk/Daftar**, **Admin**, dan **Profil/Keluar**) tidak berdesakan
atau menabrak logo pada tablet / ponsel lanskap.
- **Foto profil di navbar:** saat pengguna login, foto profil tampil langsung di
sudut kanan atas navbar pada layar kecil (`js/auth.js` menyisipkan elemen
`.nav-avatar-top`), sehingga tidak perlu membuka menu untuk melihat akun.
- **`html { overflow-x: hidden; }`:** konten dekoratif yang lebih lebar dari layar
(cahaya &amp; cincin di hero) diklip agar halaman tidak bisa digeser ke samping.
Tanpa ini, beberapa browser mobile melakukan *shrink-to-fit* sehingga **seluruh
tampilan tampak mengecil** padahal ukuran font/layout tidak berubah.

### `css/pages.css` — Halaman Kesehatan &amp; Tentang

- `page-hero` (header gradien pastel + breadcrumb).
- `dashboard-grid` (3→2→1 kolom), `dash-card` + `dash-icon` 6 varian warna.
- `progress-bar` / `progress-fill` (lebar via `--w`, animasi `fillBar`).
- `panel` + `form-group`, `bmi-result` + `bmi-scale` 4 segmen warna.
- `check-list` — interaksi `:checked` (coret + latar hijau) via `:has()`.
- `cards-3`, `info-card` + `card-banner`, `tag` 4 warna.
- `schedule-table` (header gradien, hover baris).
- `tips-grid`, `tip-item` (aksen garis kiri).
- `about-visual`, `vm-cards`, `team-grid`.

### `css/chatbot.css` — Chat

- `chat-wrapper`: sidebar 300px + area chat utama (menumpuk di mobile).
- `bot-avatar` + `status-dot` (animasi `blink`).
- `msg.bot` / `msg.user`, `typing` (animasi `typing`).
- `chat-input-box` (input pill + tombol kirim bulat).
- Semua warna memakai `var(--bg-*/--text-*)` sehingga mengikuti tema gelap.

---

## Teknik CSS-Only (Tanpa JavaScript)

Karena syarat proyek adalah **HTML + CSS saja**, semua interaksi memakai
trik CSS standar:

1. **Navigasi mobile (checkbox hack)**
   ```html
   [[ORCA_RICH_MD:c7a630ca9b9552556dd12cc5b19ba221:block-html:%20%20%20%3Cinput%20type%3D%22checkbox%22%20id%3D%22nav-toggle%22%20class%3D%22nav-toggle%22%3E]]
    [[ORCA_RICH_MD:c7a630ca9b9552556dd12cc5b19ba221:inline-html:%3Cul%20class%3D%22nav-links%22%3E]]...[[ORCA_RICH_MD:c7a630ca9b9552556dd12cc5b19ba221:inline-html:%3C%2Ful%3E]]
    [[ORCA_RICH_MD:c7a630ca9b9552556dd12cc5b19ba221:inline-html:%3Clabel%20for%3D%22nav-toggle%22%20class%3D%22hamburger%22%3E]]...[[ORCA_RICH_MD:c7a630ca9b9552556dd12cc5b19ba221:inline-html:%3C%2Flabel%3E]]
   ```

    CSS: `.nav-toggle:checked ~ .nav-links { transform: translateY(0); }`
    — klik ikon hamburger mencentang checkbox tersembunyi,
    yang menggeser menu turun. Berlaku di semua 4 halaman.
2. **Chat bot (radio-button hack)** *(sudah dihapus mulai versi 2.0)* —
   dulunya jawaban topik demo ditampilkan lewat selektor
   `#t2:checked ~ .chat-wrapper .ans-2 { display: flex; }`.
   Kini halaman `chatbot.html` mengalirkan pesan ke server lewat `#msgForm`.
3. **Checklist maintain (`:checked` + `:has()`)** *(efek CSS tetap ada,
   tapi data pencentangan kini disimpan ke server via `PUT /api/habits/:id`)*
   ```css
    .check-list input:checked + span { text-decoration: line-through; }
    .check-list li:has(input:checked) { background: rgba(16,185,129,0.12); }
   ```
4. **Progress bar animasi** — lebar target disimpan di
 custom property (`style="--w:75%"`), lalu `@keyframes fillBar`
 menganimasikan `width` dari 0 ke `var(--w)` saat halaman dimuat.

> Catatan: `:has()` didukung browser modern (Chrome 105+, Edge 105+,
> Safari 15.4+, Firefox 121+). Di browser lama, efek latar hijau
> tidak muncul tetapi coretan teks tetap berfungsi.

---

## Kustomisasi


| Kebutuhan            | File &amp; cara                                                                                                                                                                                                                                                                                                                                                                                          |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Ubah warna tema      | `css/style.css` → blok `:root` (`--primary`, `--gradient-1`, dll.)                                                                                                                                                                                                                                                                                                                                       |
| Ubah slogan          | Cari teks `Sehatkan Hidupmu, Sehatkan Masa Depanmu` di semua `.html`                                                                                                                                                                                                                                                                                                                                     |
| Tambah topik chat    | `pages/chatbot.html`: tambah `[[ORCA_RICH_MD:c7a630ca9b9552556dd12cc5b19ba221:inline-html:%3Cinput%20id%3D%22t6%22%3E]]`, `[[ORCA_RICH_MD:c7a630ca9b9552556dd12cc5b19ba221:inline-html:%3Clabel%20for%3D%22t6%22%3E]]`, `[[ORCA_RICH_MD:c7a630ca9b9552556dd12cc5b19ba221:inline-html:%3Cdiv%20class%3D%22answer%20ans-6%22%3E]]`; `css/chatbot.css`: tambah selector `#t6:checked ...` (label + jawaban) |
| Ubah angka dashboard | `pages/kesehatan.html`: edit `dash-value`, `--w` progress, `dash-note`                                                                                                                                                                                                                                                                                                                                   |
| Tambah menu navigasi | Edit blok `[[ORCA_RICH_MD:c7a630ca9b9552556dd12cc5b19ba221:inline-html:%3Cul%20class%3D%22nav-links%22%3E]]` di ke-4 file HTML                                                                                                                                                                                                                                                                           |
| Tambah logo/gambar   | Simpan di `assets/` lalu pasang dengan `[[ORCA_RICH_MD:c7a630ca9b9552556dd12cc5b19ba221:inline-html:%3Cimg%20src%3D%22..%2Fassets%2Fnamafile.png%22%3E]]`                                                                                                                                                                                                                                                |
| Ganti font           | Ganti link Google Fonts di `[[ORCA_RICH_MD:c7a630ca9b9552556dd12cc5b19ba221:inline-html:%3Chead%3E]]` + `font-family` di `body`                                                                                                                                                                                                                                                                          |


---

## Keterbatasan &amp; Pengembangan Lanjutan

**Keterbatasan versi awal — status di versi 2.0:**

- ~~Kalkulator BMI statis~~ → sudah menghitung otomatis dan tersimpan.
- ~~Checklist &amp; progres tidak tersimpan~~ → tersimpan di database.
- ~~Form newsletter tidak mengirim~~ → tersimpan di database.
- ~~Live Chat AI memakai API key di browser (BYOK)~~ → API key kini diatur
  admin di server; browser tidak pernah menerima key.
- ~~Mode gelap~~ → sudah ada (tombol di navbar), dan kontras teks pada gelembung
  chat, panel kesehatan, tabel, dan navbar sudah diperbaiki untuk tema gelap.
- Kolom input chat: aktif sebagai Live AI (butuh API key & aktivasi admin),
  riwayat tersimpan jika login.

**Ide pengembangan berikutnya:**

1. Halaman profil (ubah nama/password mandiri), lupa password via email.
2. Pengingat minum/obat yang persisten (dijadwal server, bukan `setInterval`), PWA.
3. Grafik perkembangan berat badan.

---

© 2026 AI Daily Healthy Assistant — *Sehatkan Hidupmu, Sehatkan Masa Depanmu.*