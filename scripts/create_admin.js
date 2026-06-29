require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Ganti URL jika perlu
const supabaseUrl = 'https://supabase.beragamsewabali.com';
const supabaseServiceKey = process.env.SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error('Error: SERVICE_ROLE_KEY is missing in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createAdmin() {
  console.log(`Creating user beragamsewabali@gmail.com on ${supabaseUrl}...`);
  
  const { data, error } = await supabase.auth.admin.createUser({
    email: 'beragamsewabali@gmail.com',
    password: 'password123', // <--- Ganti password ini
    email_confirm: true
  });

  if (error) {
    console.error('Failed to create user:', error.message);
  } else {
    console.log('Success! User created:');
    console.log(data.user);
  }
}

createAdmin();
