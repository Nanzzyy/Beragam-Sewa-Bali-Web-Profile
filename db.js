require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const { Pool } = require('pg');

// Gunakan pooling yang lebih efisien
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 30000, // Tingkatkan ke 30 detik untuk stabilitas
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
