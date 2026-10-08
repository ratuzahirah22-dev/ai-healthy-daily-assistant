// Target kesehatan harian yang menyesuaikan umur & jenis kelamin.
// Dipakai halaman Kesehatan agar angka acuan tidak lagi generik.
// Sumber acuan: WHO (aktivitas & tidur), National Academies/EFSA (air),
// Mifflin-St Jeor (kalori basal), rekomendasi tidur National Sleep Foundation.

// Umur dalam tahun (null bila tanggal lahir tidak ada / tidak valid)
function hitungUmur(tanggalLahir, sekarang) {
  if (!tanggalLahir) return null;
  const lahir = new Date(tanggalLahir + 'T00:00:00');
  if (Number.isNaN(lahir.getTime())) return null;
  const kini = sekarang ? new Date(sekarang) : new Date();
  let umur = kini.getFullYear() - lahir.getFullYear();
  const m = kini.getMonth() - lahir.getMonth();
  if (m < 0 || (m === 0 && kini.getDate() < lahir.getDate())) umur--;
  if (umur < 0 || umur > 120) return null;
  return umur;
}

// Kelompok umur: anak, remaja, dewasa, lansia
function kelompok(umur) {
  if (umur === null) return 'dewasa';
  if (umur <= 8) return 'anak';
  if (umur <= 17) return 'remaja';
  if (umur <= 64) return 'dewasa';
  return 'lansia';
}

// Kebutuhan minum (1 gelas = 250 ml), mengikuti acuan per kelompok umur & gender
function gelasAir(umur, jk) {
  if (umur === null) return 8;
  if (umur <= 3) return 4;   // ~1,0 L
  if (umur <= 8) return 5;   // ~1,25 L
  if (umur <= 13) return jk === 'P' ? 6 : 7;
  if (umur <= 18) return jk === 'P' ? 7 : 9;
  if (umur <= 64) return jk === 'P' ? 8 : 10;  // P ~2,0 L, L ~2,5 L
  return jk === 'P' ? 7 : 8;                     // lansia: lebih mudah dehidrasi, tetap dipantau
}

// Rentang tidur ideal per kelompok umur (National Sleep Foundation)
function rentangTidur(umur) {
  if (umur === null) return { min: 7, max: 9 };
  if (umur <= 2) return { min: 11, max: 14 };
  if (umur <= 5) return { min: 10, max: 13 };
  if (umur <= 13) return { min: 9, max: 11 };
  if (umur <= 17) return { min: 8, max: 10 };
  if (umur <= 64) return { min: 7, max: 9 };
  return { min: 7, max: 8 };
}

// Target langkah harian: anak & remaja lebih banyak bergerak, lansia lebih konsisten (bukan angka besar)
function targetLangkah(umur) {
  if (umur === null) return 10000;
  if (umur <= 8) return 6000;      // aktivitas bermain, tidak mengejar angka
  if (umur <= 13) return 10000;
  if (umur <= 17) return 10000;
  if (umur <= 64) return 10000;
  return 7000;                      // lansia: fokus kemandirian gerak & terhindar dari sedenter
}

// Kebutuhan kalori (TDEE) dengan rumus Mifflin-St Jeor x faktor aktivitas ringan.
// Butuh berat, tinggi, umur, dan jenis kelamin. Bila data kurang, pakai nilai acuan umum.
function targetKalori(umur, jk, tinggi, berat) {
  if (umur === null) return 2000;
  if (umur < 19 || !tinggi || !berat) {
    // Acuan kasar anak & remaja (bergantung umur & gender)
    if (umur <= 8) return 1400;
    if (umur <= 13) return jk === 'P' ? 1800 : 2000;
    if (umur <= 17) return jk === 'P' ? 2000 : 2500;
    return 2000;
  }
  const bmr = 10 * berat + 6.25 * tinggi - 5 * umur + (jk === 'P' ? -161 : 5);
  return Math.round(bmr * 1.4 / 10) * 10; // aktivitas ringan-sedang
}

// Kumpulan target + catatan penjelas
function hitungTarget(profil) {
  const umur = hitungUmur(profil.tanggal_lahir);
  const jk = profil.jenis_kelamin === 'L' || profil.jenis_kelamin === 'P' ? profil.jenis_kelamin : null;
  const tingkat = kelompok(umur);
  const tidur = rentangTidur(umur);
  const tidakLengkap = umur === null;

  return {
    umur: umur,
    kel_umur: tingkat,
    air_gelas: gelasAir(umur, jk),
    langkah: targetLangkah(umur),
    kalori: targetKalori(umur, jk, Number(profil.tinggi_cm) || null, Number(profil.berat_kg) || null),
    tidur_min: tidur.min,
    tidur_max: tidur.max,
    lengkap: !tidakLengkap,
    catatan: tidakLengkap
      ? 'Isi tanggal lahir & jenis kelamin di Profil agar targetmu dihitung otomatis sesuai umur.'
      : 'Target dihitung dari umur ' + umur + ' tahun' + (jk ? (jk === 'L' ? ' (laki-laki)' : ' (perempuan)') : '') + '.'
  };
}

module.exports = { hitungUmur, hitungTarget, kelompok };
