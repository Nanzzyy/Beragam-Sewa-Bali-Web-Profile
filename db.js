const mysql = require('mysql2/promise');

// Buat koneksi pool ke database Anda.
// Ganti placeholder di bawah ini dengan kredensial database MySQL Anda.
const pool = mysql.createPool({
  host: 'localhost',      // Alamat server database Anda, biasanya 'localhost'
  user: 'root',           // Nama pengguna database Anda
  password: '',           // Kata sandi database Anda
  database: 'beragam_sewa_bali', // Nama database yang Anda buat
  port: 3307,          // Port database MySQL, biasanya 3307
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

module.exports = pool;
