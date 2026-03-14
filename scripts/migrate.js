const db = require('../db');

async function migrate() {
    try {
        await db.query("ALTER TABLE section_images ADD COLUMN IF NOT EXISTS long_text TEXT;");
        console.log("Migration successful: Added long_text column.");
        process.exit(0);
    } catch (err) {
        console.error("Migration failed:", err.message);
        process.exit(1);
    }
}

migrate();
