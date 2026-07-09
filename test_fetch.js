const { createClient } = require('@supabase/supabase-js');
// Need to find the anon key and url from .env.production
const fs = require('fs');
const env = fs.readFileSync('.env.production', 'utf-8');
const urlMatch = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
const keyMatch = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/);

const supabase = createClient(urlMatch[1].trim(), keyMatch[1].trim());

async function run() {
  const { data, error } = await supabase.from('accounts').select('*').limit(1);
  console.log(data);
}
run();
