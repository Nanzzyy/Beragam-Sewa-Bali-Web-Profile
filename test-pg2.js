require('dotenv').config();
const pool = require('./db.js');

(async () => {
    try {
        console.log('Testing connection...');
        await pool.query('SELECT NOW()');
        console.log('Connection OK. Testing INSERT...');
        const result = await pool.query(
            `INSERT INTO site_content (content_key, content_value) VALUES ($1, $2)
       ON CONFLICT (content_key) DO UPDATE SET content_value = EXCLUDED.content_value, updated_at = NOW()`,
            ['home_title', 'Test Title']
        );
        console.log('INSERT SUCCESS:', result.rowCount);
    } catch (e) {
        console.error('ERROR MESSAGE:', e.message);
        console.error('ERROR FULL:', e);
    } finally {
        pool.end();
    }
})();
