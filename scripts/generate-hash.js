/**
 * Script untuk generate bcrypt hash dari password admin.
 * Jalankan: node scripts/generate-hash.js
 * Lalu copy output ke .env sebagai ADMIN_PASSWORD_HASH
 */

const bcrypt = require('bcryptjs');
const readline = require('readline');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

rl.question('Masukkan password admin yang ingin di-hash: ', async (password) => {
    if (!password || password.length < 8) {
        console.error('❌ Password minimal 8 karakter!');
        rl.close();
        process.exit(1);
    }
    const hash = await bcrypt.hash(password, 12);
    console.log('\n✅ Hash berhasil dibuat!\n');
    console.log('Tambahkan baris berikut ke file .env kamu:\n');
    console.log(`ADMIN_PASSWORD_HASH=${hash}`);
    console.log('\n⚠️  JANGAN bagikan hash ini ke siapapun dan jangan commit ke Git!\n');
    rl.close();
});
