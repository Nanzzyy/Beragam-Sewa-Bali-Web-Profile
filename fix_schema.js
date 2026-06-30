const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://postgres:your-super-secret-and-long-postgres-password@172.17.0.1:5435/postgres',
  ssl: false
});

async function run() {
  const client = await pool.connect();
  try {
    await client.query('DROP TABLE IF EXISTS public.package_items');
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.package_items (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          package_id UUID NOT NULL REFERENCES public.packages(id) ON DELETE CASCADE,
          item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
          qty INTEGER DEFAULT 1,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    console.log('package_items created');

    await client.query('ALTER TABLE public.items ALTER COLUMN price DROP NOT NULL');
    console.log('items.price made optional');
  } catch (err) {
    console.error(err);
  } finally {
    client.release();
    pool.end();
  }
}
run();
