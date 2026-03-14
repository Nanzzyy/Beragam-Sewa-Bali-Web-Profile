require('dotenv').config();
const { Pool } = require('pg');

// Gunakan pooling yang lebih efisien
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  },
  // Tambahkan parameter berikut untuk stabilitas
  max: 10,                 // Maksimal 10 koneksi simultan
  idleTimeoutMillis: 30000, // Tutup koneksi idle setelah 30 detik
  connectionTimeoutMillis: 20000, // Tunggu hingga 20 detik untuk koneksi baru (penting untuk Supabase free tier)
});

// Listener untuk memantau status pool
pool.on('connect', (client) => {
  // Hanya log jika benar-benar diperlukan untuk debug
  // console.log('✅ Client terhubung ke pool');
});

pool.on('error', (err) => {
  console.error('❌ Unexpected error on idle client:', err.message);
});

// Verifikasi koneksi sekali saja saat startup dengan cara yang lebih aman
const verifyConnection = async () => {
  try {
    const client = await pool.connect();
    console.log('✅ PostgreSQL terhubung ke Supabase!');
    client.release(); // Kembalikan ke pool
  } catch (err) {
    console.error('❌ Koneksi database gagal pada awal startup:', err.message);
    console.log('⚠️  Server tetap berjalan, akan mencoba menghubungkan kembali saat ada request...');
  }
};

verifyConnection();

module.exports = pool;
