require('dotenv').config();
const supabase = require('./db.js');

async function run() {
  console.log("URL:", process.env.SUPABASE_URL);
  console.log("KEY:", process.env.SUPABASE_KEY.substring(0, 15) + "...");
  const { data, error } = await supabase.from('site_content').select('*').limit(1);
  if (error) {
    console.error("SUPABASE ERROR:", error);
  } else {
    console.log("SUCCESS:", data);
  }
}
run();
