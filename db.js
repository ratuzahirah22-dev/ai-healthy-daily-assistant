// Koneksi ke MySQL (pool = kumpulan koneksi yang dipakai bergantian)
require('dotenv').config();
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'ai_healthy',
  charset: 'utf8mb4',
  dateStrings: true,        // kolom DATE dikembalikan sebagai teks 'YYYY-MM-DD'
  waitForConnections: true,
  connectionLimit: 10
});

module.exports = pool;
