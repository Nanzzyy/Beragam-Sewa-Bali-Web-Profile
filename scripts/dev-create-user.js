/**
 * dev-create-user.js
 *
 * Buat user dev LOKAL di stack Supabase Docker lokal (bukan produksi).
 * - createUser dengan user_metadata.role = 'owner' → trigger handle_new_user
 *   otomatis insert profile role owner.
 * - Fallback: bila trigger tidak attached, upsert profiles row secara manual.
 *
 * Untuk develop/upgrade-test local sesudah clone data produksi.
 *
 * Env (dibaca dari .env root):
 *   SUPABASE_URL          URL Supabase lokal        (default: http://localhost:8000)
 *   SERVICE_ROLE_KEY      service_role key LOKAL    (wajib — dari utils/generate-keys.sh)
 *   DEV_USER_EMAIL        email user dev            (default: dev@beragamsewabali.com)
 *   DEV_USER_PASSWORD     password user dev         (default: devpass123)
 *   DEV_USER_ROLE         role profile              (default: owner)
 *
 * Usage:
 *   node scripts/dev-create-user.js
 *   DEV_USER_EMAIL=aku@mail.com DEV_USER_PASSWORD=rahasia node scripts/dev-create-user.js
 */

require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || 'http://localhost:8000';
const serviceRoleKey = process.env.SERVICE_ROLE_KEY;
const email = process.env.DEV_USER_EMAIL || 'dev@beragamsewabali.com';
const password = process.env.DEV_USER_PASSWORD || 'devpass123';
const role = process.env.DEV_USER_ROLE || 'owner';

if (!serviceRoleKey) {
  console.error('Error: SERVICE_ROLE_KEY missing di .env (gunakan key LOKAL dari utils/generate-keys.sh, bukan prod).');
  process.exit(1);
}

// Guard: tolak bila tertuju ke domain produksi
if (/beragamsewabali\.com|supabase\.io/i.test(supabaseUrl)) {
  console.error(`Error: SUPABASE_URL (${supabaseUrl}) terlihat seperti PRODUKSI.`);
  console.error('Script ini hanya untuk stack LOKAL. Set SUPABASE_URL=http://localhost:8000 di .env.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  console.log(`Membuat user dev di ${supabaseUrl} ...`);
  console.log(`  email    : ${email}`);
  console.log(`  role     : ${role}`);

  // 1. Create auth user (trigger handle_new_user akan insert profile)
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { role },
  });

  let userId;
  if (error) {
    // Bila user sudah ada, ambil id-nya lewat listUsers
    if (/already|exists/i.test(error.message)) {
      console.warn('User sudah ada, mencari id yang sudah ada...');
      const { data: list } = await supabase.auth.admin.listUsers();
      const found = (list?.users || []).find((u) => u.email === email);
      if (!found) throw new Error('User ada tapi tidak ditemukan di listUsers.');
      userId = found.id;
      console.log(`→ Gunakan user existing id=${userId}`);
    } else {
      throw error;
    }
  } else {
    userId = data.user.id;
    console.log(`→ User dibuat, id=${userId}`);
  }

  // 2. Set role profile. Trigger handle_new_user versi prod hardcode 'guest',
  //    jadi kita UPDATE eksplisit ke role yg diinginkan (perlu GRANT, sudah
  //    di-apply otomatis oleh scripts/dev-clone-prod.sh).
  const { error: updErr } = await supabase
    .from('profiles')
    .update({ role })
    .eq('id', userId);

  if (updErr) {
    console.warn(`Warning: gagal UPDATE profiles role: ${updErr.message}`);
    console.warn('Jalankan manual di supabase-db:');
    console.warn(`  docker exec supabase-db psql -U postgres -d postgres -c "UPDATE public.profiles SET role='${role}' WHERE id='${userId}';"`);
  } else {
    console.log(`→ Profile role='${role}' diset.`);
  }

  console.log('\n✅ Selesai. Login di app local dengan:');
  console.log(`   email    : ${email}`);
  console.log(`   password : ${password}`);
}

main().catch((e) => {
  console.error('Gagal:', e.message);
  process.exit(1);
});
