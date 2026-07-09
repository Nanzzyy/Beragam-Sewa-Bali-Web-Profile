const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('http://localhost:8000', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'admin@pravenbali.com', // staff
    password: 'password123' // assuming this is the password or something... wait we can't login easily
  });
}
