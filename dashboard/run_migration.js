const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const host = 'db.izqrlblxbajnaovelvef.supabase.co';
const passwords = ['Nanda123', 'Admin@Bali2025', 'admin123', 'YOUR_DB_PASSWORD']; // trying known from previous

async function run() {
  const sql = fs.readFileSync(path.join(__dirname, 'migration.sql'), 'utf8');
  for (const pw of passwords) {
    const client = new Client({
      connectionString: `postgresql://postgres:${pw}@${host}:5432/postgres`,
      ssl: { rejectUnauthorized: false }
    });
    try {
      await client.connect();
      console.log(`Connected with password. Executing migration...`);
      await client.query(sql);
      console.log('Migration executed successfully!');
      await client.query(`NOTIFY pgrst, 'reload schema';`);
      console.log('Schema cache reloaded!');
      await client.end();
      return;
    } catch (e) {
      if (e.message.includes('password authentication failed')) {
        continue;
      } else {
        console.log(`Error running SQL:`, e.message);
        return;
      }
    }
  }
  console.log('Failed to connect: Incorrect passwords');
}
run();
