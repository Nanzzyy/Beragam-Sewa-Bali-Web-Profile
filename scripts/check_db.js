const db = require('../db');

async function checkColumns() {
    try {
        const res = await db.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'section_images';
        `);
        console.log("Columns in section_images:");
        res.rows.forEach(row => {
            console.log(`- ${row.column_name} (${row.data_type})`);
        });
        process.exit(0);
    } catch (err) {
        console.error("Error checking columns:", err.message);
        process.exit(1);
    }
}

checkColumns();
