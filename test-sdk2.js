require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL.trim();
const supabaseKey = process.env.SUPABASE_KEY.trim();

console.log('URL:', supabaseUrl);
console.log('Key length:', supabaseKey ? supabaseKey.length : 'NULL');

const supabase = createClient(supabaseUrl, supabaseKey);

(async () => {
    try {
        const res = await supabase.from('site_content').select('*').limit(1);
        console.log('SDK Result:', res);
    } catch (e) {
        console.error('SDK Exception:', e.message);
    }
})();
