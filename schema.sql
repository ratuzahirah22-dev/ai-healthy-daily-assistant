-- ==========================================================================
-- AI Daily Healthy Assistant — Skema Database MySQL / MariaDB
-- Dijalankan otomatis oleh:  npm run setup
-- Aman dijalankan berulang kali (tidak menghapus data yang sudah ada).
-- ==========================================================================

CREATE DATABASE IF NOT EXISTS ai_healthy
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE ai_healthy;

-- 1. Pengguna (akun) ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id             INT UNSIGNED  NOT NULL AUTO_INCREMENT PRIMARY KEY,
  nama           VARCHAR(60)   NOT NULL,
  email          VARCHAR(120)  NOT NULL UNIQUE,
  password_hash  VARCHAR(100)  NOT NULL,            -- hasil bcrypt, bukan password asli
  jenis_kelamin  ENUM('L','P') NULL,
  tanggal_lahir  DATE          NULL,               -- dipakai menghitung umur untuk target personal
  tinggi_cm      DECIMAL(5,1)  NULL,
  berat_kg       DECIMAL(5,1)  NULL,
  role           ENUM('user','admin') NOT NULL DEFAULT 'user',
  foto           VARCHAR(255)  NULL DEFAULT NULL,  -- foto profil
  last_seen      TIMESTAMP     NULL DEFAULT NULL,   -- terakhir membuka website (untuk hitung pengguna aktif)
  created_at     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 2. Catatan kesehatan harian (satu baris per pengguna per hari) ---------------
CREATE TABLE IF NOT EXISTS health_logs (
  id             INT UNSIGNED  NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id        INT UNSIGNED  NOT NULL,
  tanggal        DATE          NOT NULL,
  air_gelas      TINYINT UNSIGNED  NOT NULL DEFAULT 0,
  langkah        INT UNSIGNED  NOT NULL DEFAULT 0,
  tidur_jam      DECIMAL(3,1)  NOT NULL DEFAULT 0,
  kalori         INT UNSIGNED  NOT NULL DEFAULT 0,
  detak_jantung  SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  UNIQUE KEY uq_user_tanggal (user_id, tanggal),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 3. Riwayat hitung BMI -------------------------------------------------------
CREATE TABLE IF NOT EXISTS bmi_records (
  id             INT UNSIGNED  NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id        INT UNSIGNED  NOT NULL,
  tinggi_cm      DECIMAL(5,1)  NOT NULL,
  berat_kg       DECIMAL(5,1)  NOT NULL,
  bmi            DECIMAL(4,1)  NOT NULL,
  kategori       VARCHAR(30)   NOT NULL,
  created_at     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 4. Kebiasaan sehat (daftar tetap) + catatan ceklis per hari -------------------
CREATE TABLE IF NOT EXISTS habits (
  id    TINYINT UNSIGNED NOT NULL PRIMARY KEY,
  nama  VARCHAR(80)      NOT NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS habit_logs (
  user_id   INT UNSIGNED     NOT NULL,
  habit_id  TINYINT UNSIGNED NOT NULL,
  tanggal   DATE             NOT NULL,
  PRIMARY KEY (user_id, habit_id, tanggal),
  FOREIGN KEY (user_id)  REFERENCES users(id)  ON DELETE CASCADE,
  FOREIGN KEY (habit_id) REFERENCES habits(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 5. Riwayat chat dengan Dokter AI --------------------------------------------
CREATE TABLE IF NOT EXISTS chat_messages (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id     INT UNSIGNED NOT NULL,
  role        ENUM('user','assistant') NOT NULL,
  isi         TEXT         NOT NULL,
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_user_waktu (user_id, id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 6. Ulasan/testimoni di beranda (satu ulasan per pengguna, dimoderasi admin) ---
-- status: menunggu = baru dikirim pengguna, menunggu ditinjau admin
--         draft    = ditahan/disimpan admin sebagai cadangan, belum ditampilkan
--         diterima = disetujui admin, tampil publik di beranda
--         ditolak  = tidak ditampilkan ke publik
CREATE TABLE IF NOT EXISTS testimonials (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id       INT UNSIGNED NULL UNIQUE,            -- NULL = contoh bawaan
  nama          VARCHAR(60)  NOT NULL,
  kota          VARCHAR(40)  NOT NULL DEFAULT '',
  isi           VARCHAR(400) NOT NULL,
  rating        TINYINT UNSIGNED NOT NULL DEFAULT 5,
  status        ENUM('menunggu','draft','diterima','ditolak') NOT NULL DEFAULT 'menunggu',
  ditinjau_at   TIMESTAMP    NULL DEFAULT NULL,       -- kapan admin memoderasi
  ditinjau_oleh INT UNSIGNED NULL,                    -- admin yang memoderasi
  created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_status_waktu (status, created_at),
  FOREIGN KEY (user_id)       REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (ditinjau_oleh) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- 7. Pelanggan newsletter -----------------------------------------------------
CREATE TABLE IF NOT EXISTS subscribers (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  email       VARCHAR(120) NOT NULL UNIQUE,
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 8. Pengaturan Chatbot AI (diatur admin, hanya satu baris dengan id = 1) --------
CREATE TABLE IF NOT EXISTS chatbot_settings (
  id             TINYINT UNSIGNED NOT NULL PRIMARY KEY,
  aktif          TINYINT(1)    NOT NULL DEFAULT 0,
  base_url       VARCHAR(200)  NOT NULL DEFAULT 'https://api.openai.com/v1',
  model          VARCHAR(100)  NOT NULL DEFAULT 'gpt-4o-mini',
  api_key        VARCHAR(300)  NOT NULL DEFAULT '',
  system_prompt  TEXT          NOT NULL,
  temperature    DECIMAL(2,1)  NOT NULL DEFAULT 0.7,
  max_tokens     SMALLINT UNSIGNED NOT NULL DEFAULT 600,
  updated_at     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 9. Pemakaian token Chatbot AI per pengguna ----------------------------------
-- Dipisah dari chat_messages: tetap tercatat walau pengguna menghapus riwayat chat-nya.
-- Admin hanya melihat angka pemakaian ini, bukan isi percakapan.
CREATE TABLE IF NOT EXISTS chat_usage (
  id                 INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id            INT UNSIGNED NOT NULL,
  model              VARCHAR(100) NOT NULL,
  prompt_tokens      INT UNSIGNED NOT NULL DEFAULT 0,   -- token yang dikirim (pertanyaan + konteks)
  completion_tokens  INT UNSIGNED NOT NULL DEFAULT 0,   -- token jawaban AI
  total_tokens       INT UNSIGNED NOT NULL DEFAULT 0,
  created_at         TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_user_waktu (user_id, created_at),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 10. Database makanan (nilai resepsi lokal, tanpa panggil AI) -------------------
CREATE TABLE IF NOT EXISTS foods (
  id           TINYINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  nama         VARCHAR(80)      NOT NULL,
  kategori     VARCHAR(30)      NOT NULL,
  kcal_per_100g SMALLINT UNSIGNED NOT NULL,          -- energi per 100 gram (USDA & Tabel Gizi Indonesia)
  gram_porsi   SMALLINT UNSIGNED NOT NULL DEFAULT 100, -- berat porsi lazim (diatur admin)
  takaran      VARCHAR(40)      NOT NULL DEFAULT '', -- contoh takaran lazim, mis. "1 gelas (150 g)"
  UNIQUE KEY uq_foods_nama (nama)
) ENGINE=InnoDB;

-- 11. Catatan makanan yang dimakan pengguna (satu baris per item per hari) -----
CREATE TABLE IF NOT EXISTS food_logs (
  id          INT UNSIGNED     NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id     INT UNSIGNED     NOT NULL,
  makanan_id  TINYINT UNSIGNED NOT NULL,
  tanggal     DATE             NOT NULL,
  jumlah_gram SMALLINT UNSIGNED NOT NULL DEFAULT 100,
  FOREIGN KEY (makanan_id) REFERENCES foods(id)  ON DELETE CASCADE,
  FOREIGN KEY (user_id)     REFERENCES users(id)  ON DELETE CASCADE,
  KEY idx_user_tanggal (user_id, tanggal)
) ENGINE=InnoDB;

-- Data awal: 7 kebiasaan sehat (sama dengan halaman Kesehatan sebelumnya) -------
INSERT IGNORE INTO habits (id, nama) VALUES
  (1, 'Minum 8 gelas air putih'),
  (2, 'Olahraga 30 menit'),
  (3, 'Makan sayur & buah'),
  (4, 'Tidur sebelum jam 23.00'),
  (5, 'Jalan kaki 5.000+ langkah'),
  (6, 'Meditasi 10 menit'),
  (7, 'Tidak minum minuman bersoda');

-- Data awal: nilai}gizi makanan umum Indonesia (energi per 100 gram) ---------
-- Dipakai fitur "Catat Makanan": pengguna memilih makanan + berat, lalu Calories
-- dihitung di server (tidak memakai AI sama sekali, jadi tidak memakai kuota token).
INSERT IGNORE INTO foods (nama, kategori, kcal_per_100g, takaran) VALUES
  -- Karbohidrat
  ('Nasi putih',            'Karbohidrat', 155, '1 gelas (150 g)'),
  ('Nasi merah',            'Karbohidrat', 125, '1 gelas (150 g)'),
  ('Nasi goreng',           'Karbohidrat', 168, '1 piring (200 g)'),
  ('Bubur nasi',            'Karbohidrat',  46, '1 mangkuk (300 g)'),
  ('Roti tawar',            'Karbohidrat', 265, '1 lembar (25 g)'),
  ('Kentang rebus',         'Karbohidrat',  87, '1 buah (150 g)'),
  ('Oatmeal kering',       'Karbohidrat', 389, '1 porsi (40 g)'),
  ('Pasta matang',          'Karbohidrat', 158, '1 piring (150 g)'),
  ('Mie instan',            'Karbohidrat', 436, '1 bungkus (85 g)'),
  -- Protein
  ('Ayam goreng',           'Protein',     260, '1 potong (100 g)'),
  ('Ayam panggang',         'Protein',     165, '1 potong (100 g)'),
  ('Daging sapi rebus',     'Protein',     190, '1 porsi (100 g)'),
  ('Ikan bakar',            'Protein',     155, '1 porsi (120 g)'),
  ('Ikan tuna',             'Protein',     116, '1 kaleng (100 g)'),
  ('Telur rebus',           'Protein',     155, '1 butir (50 g)'),
  ('Telur goreng',          'Protein',     196, '1 butir (50 g)'),
  ('Tahu',                  'Protein',      78, '1 potong (100 g)'),
  ('Tempe',                 'Protein',     192, '1 potong (100 g)'),
  ('Susu sapi whole milk',  'Protein',      61, '1 gelas (250 ml)'),
  ('Yogurt plain',          'Protein',      59, '1 cup (150 g)'),
  ('Keju cheddar',          'Protein',     402, '1 potong (30 g)'),
  -- Sayur
  ('Bayam',                 'Sayur',        23, '1 piring (100 g)'),
  ('Wortel',                'Sayur',        41, '1 buah (80 g)'),
  ('Brokoli',               'Sayur',        34, '1 piring (100 g)'),
  ('Tomat',                 'Sayur',        18, '1 buah (100 g)'),
  ('Timun',                 'Sayur',        15, '1 buah (150 g)'),
  ('Kubis',                 'Sayur',        25, '1 piring (100 g)'),
  -- Buah
  ('Apel',                  'Buah',         52, '1 buah (150 g)'),
  ('Jeruk',                 'Buah',         47, '1 buah (150 g)'),
  ('Pisang',                'Buah',         89, '1 buah (120 g)'),
  ('Anggur',                'Buah',         69, '1 tangkai (15 buah)'),
  ('Semangka',              'Buah',         30, '1 potong (200 g)'),
  ('Mangga',                'Buah',         60, '1 buah (200 g)'),
  ('Alpukat',               'Buah',        160, '1/2 buah (70 g)'),
  -- Cemilan
  ('Kentang goreng',        'Cemilan',     312, '1 porsi (100 g)'),
  ('Keripik kentang',       'Cemilan',     536, '1 bungkus kecil (40 g)'),
  ('Cokelat batang',        'Cemilan',     546, '1 batang (30 g)'),
  ('Kacang tanah',          'Cemilan',     567, '1 genggaman (30 g)'),
  ('Almond',                'Cemilan',     579, '1 genggaman (30 g)'),
  ('Biskuit crackers',      'Cemilan',     430, '1 bungkus (35 g)'),
  ('Donat gula',            'Cemilan',     421, '1 buah (60 g)'),
  ('Es krim',               'Cemilan',     207, '1 mangkuk (100 g)');

-- 12. Jadwal / pengingat kegiatan pengguna (halaman "Jadwal Hari Ini") ---------
-- ulangi: 'sekali'   = hanya pada kolom `tanggal`
--         'harian'   = setiap hari
--         'mingguan' = setiap minggu pada kolom `hari` (1=Minggu ... 7=Sabtu)
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
) ENGINE=InnoDB;

-- 13. Tanda jadwal yang sudah dikerjakan (per hari), mirip habit_logs ----------
CREATE TABLE IF NOT EXISTS schedule_done (
  user_id     INT UNSIGNED NOT NULL,
  schedule_id INT UNSIGNED NOT NULL,
  tanggal     DATE         NOT NULL,
  PRIMARY KEY (user_id, schedule_id, tanggal),
  FOREIGN KEY (user_id)     REFERENCES users(id)     ON DELETE CASCADE,
  FOREIGN KEY (schedule_id) REFERENCES schedules(id) ON DELETE CASCADE
) ENGINE=InnoDB;
