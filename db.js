const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL || 
  (process.env.POSTGRES_HOST && process.env.POSTGRES_PASSWORD 
    ? `postgresql://postgres:${process.env.POSTGRES_PASSWORD}@${process.env.POSTGRES_HOST}:${process.env.POSTGRES_PORT || 5432}/${process.env.POSTGRES_DB || 'postgres'}` 
    : 'postgresql://postgres:your-super-secret-and-long-postgres-password@172.17.0.1:5435/postgres');

const pool = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client:', err.message);
});

module.exports = pool;
