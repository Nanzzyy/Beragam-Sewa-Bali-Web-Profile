require('dotenv').config();
const db = require('./db');
async function check() {
  try {
    const res = await db.query('SELECT * FROM site_content');
    console.log("site_content:", res.rows);
    const images = await db.query('SELECT * FROM section_images');
    console.log("section_images count:", images.rows.length);
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
check();
