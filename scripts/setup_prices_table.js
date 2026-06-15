require('dotenv').config({ path: '../.env' });
const { Pool } = require('pg');

// Gunakan DATABASE_URL dari env
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function createPricesTable() {
    try {
        console.log("Connecting to database and creating catalog_prices table if not exists...");
        await pool.query(`
            CREATE TABLE IF NOT EXISTS catalog_prices (
                id SERIAL PRIMARY KEY,
                item_id INTEGER NOT NULL,
                item_type VARCHAR(50) NOT NULL,
                price NUMERIC(15,2),
                price_unit VARCHAR(50),
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW(),
                UNIQUE(item_id, item_type)
            );
        `);
        console.log("✅ Table catalog_prices successfully created or already exists!");
    } catch (e) {
        console.error("❌ Error creating table:", e.message);
    } finally {
        pool.end();
    }
}

createPricesTable();
