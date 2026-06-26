# Panduan Deployment ke Coolify

Dokumen ini menjelaskan cara men-deploy ekosistem Beragam Sewa Bali ke server rumahan menggunakan [Coolify](https://coolify.io), dengan fokus pada **keamanan rahasia (`.env`)** dan **struktur Monorepo**.

## 1. Keamanan `.env` dan Skema SQL
File `.env` dan `*.sql` (seperti `latest_schema.sql`) **TIDAK PERNAH** di-commit ke Git. `.gitignore` sudah dikonfigurasi untuk mencegah hal tersebut agar tidak ada orang lain yang bisa men-clone rahasia server Anda.

**Lalu bagaimana Coolify membacanya?**
Di Coolify, Anda **tidak perlu** mengunggah file `.env` secara fisik.
1. Pada Dashboard Coolify, masuk ke aplikasi/servis Anda.
2. Buka tab **Environment Variables**.
3. *Paste* isi file `.env` lokal Anda ke fitur "Paste .env" yang disediakan oleh Coolify.
4. Coolify secara otomatis akan menyuntikkan (inject) variabel tersebut dengan aman ke dalam container saat proses *build* maupun *runtime* tanpa menyimpannya di source code.

Untuk file `latest_schema.sql`:
1. Jika menggunakan service PostgreSQL standar di Coolify, Anda dapat menyambungkan database menggunakan GUI klien seperti **DBeaver** atau **TablePlus** melalui port yang di-expose Coolify, lalu jalankan `latest_schema.sql` secara manual.
2. Jika Anda mendeploy custom `docker-compose.yml` untuk Supabase, Anda dapat mengunggah `latest_schema.sql` ke server Anda menggunakan SFTP/SSH ke direktori persisten (misalnya `/opt/coolify/data/bsb/volumes/db/`) dan memetakan volume tersebut pada `docker-compose.yml`.

## 2. Struktur Monorepo di Coolify
Proyek ini merupakan Monorepo dengan 3 aplikasi. Anda bisa menambahkannya sebagai 3 **Applications** terpisah di Coolify menggunakan satu repositori Git yang sama!

### A. Deploy `apps/web` (Next.js SSR Server)
Aplikasi utama ini memiliki *API Routes* dan *Server-Side Rendering*. Kami sudah menyertakan mode `output: 'standalone'` untuk optimasi Docker.
- **Build Pack:** Nixpacks
- **Base Directory:** `/` (Root directory dari repo)
- **Install Command:** `npm install`
- **Build Command:** `npm run build --workspace=apps/web`
- **Start Command:** `npm run start --workspace=apps/web`
- **Port:** `3000`
- **Environment Variables:** Masukkan rahasia yang ada di `apps/web/.env`

### B. Deploy `api` (Express Backend Server - Jika Masih Digunakan)
Jika aplikasi Anda masih terhubung ke backend Express lama:
- **Build Pack:** Nixpacks
- **Base Directory:** `/`
- **Install Command:** `npm install`
- **Build Command:** *(kosongkan)*
- **Start Command:** `node api/index.js`
- **Port:** `3005` (sesuaikan dengan port Express Anda)
- **Environment Variables:** Masukkan `.env` utama.

### C. Deploy `apps/dashboard` (Static Export)
Aplikasi POS Dashboard ini dibangun menjadi static HTML (`output: 'export'`).
- **Build Pack:** Nixpacks (Atau Static HTML Caddy/Nginx image)
- **Base Directory:** `/`
- **Install Command:** `npm install`
- **Build Command:** `npm run build --workspace=apps/dashboard`
- **Publish Directory:** `/apps/dashboard/out` (Direktori tempat file statis dihasilkan)
- **Environment Variables:** Masukkan rahasia yang ada di `.env.local`

### D. Deploy `apps/cashflow` (Static Export)
Sistem Akuntansi yang dibangun menjadi static HTML (`output: 'export'`).
- **Build Pack:** Nixpacks
- **Base Directory:** `/`
- **Install Command:** `npm install`
- **Build Command:** `npm run build --workspace=apps/cashflow`
- **Publish Directory:** `/apps/cashflow-build` (Telah dikonfigurasi melalui `next.config.ts`)
- **Environment Variables:** Masukkan rahasia yang ada di `apps/cashflow/.env.local`

## 3. Deploy Supabase Self-Hosted (Solusi Bersih)

**⚠️ PERINGATAN PENTING**: Jangan menggunakan metode "Copy-Paste docker-compose" biasa di Coolify untuk Supabase. Hal ini akan menyebabkan container `kong` dan `db` menjadi **Unhealthy** karena mereka membutuhkan file konfigurasi fisik (seperti `kong.yml` dan `kong-entrypoint.sh`) yang berada di folder `volumes/`.

**Langkah-langkah yang Benar (Git Repository Mode):**
1. Di Coolify, buat resource baru (Project -> Environment -> New).
2. Pilih tipe sumber **Git Repository**.
3. Hubungkan akun GitHub/GitLab Anda dan pilih repositori `Beragam-Sewa-Bali-Web-Profile` ini.
4. Pada tipe *Build Pack*, pilih **Docker Compose**.
5. Atur **Base Directory** ke `/` (root repositori) agar Coolify bisa menemukan file `docker-compose.yml` dan memetakan folder `volumes/` secara otomatis.
6. Buka tab **Environment Variables** di Coolify, lalu *paste* seluruh isi file `.env.supabase` (atau `.env` gabungan Anda) ke fitur *Paste .env*.
7. Klik **Deploy**!
Karena berbasis Git, Coolify akan melakukan `git clone` dan mem-mount file-file seperti `volumes/api/kong.yml` dengan benar, sehingga Gateway Kong dan Database akan berjalan dengan status **Healthy**.

## 4. Migrasi / Load Data Database (Post-Deploy)

Karena file dump SQL (seperti `supabase_data_full.sql` atau `latest_schema.sql`) diabaikan oleh `.gitignore` demi keamanan rahasia, file tersebut tidak ikut ter-deploy oleh Coolify.

Setelah Supabase berstatus Healthy, lakukan migrasi data:
1. **Upload File Dump**: Gunakan SFTP/SCP untuk mengunggah file SQL Anda (misal `latest_schema.sql`) ke server VPS Anda. Letakkan file ini di direktori di mana repositori Coolify berada.
2. **Jalankan Helper Script**: Kami telah menyediakan script pembantu untuk otomatisasi. Masuk ke terminal server Anda melalui SSH, lalu arahkan ke direktori repositori Anda, dan jalankan:
   ```bash
   ./scripts/coolify_restore_db.sh /path/to/latest_schema.sql
   ```
   Script ini akan mem-pipe file dump langsung ke dalam container PostgreSQL.
3. Cek Dashboard Supabase Studio Anda untuk memastikan seluruh skema, tabel, dan akun (auth) telah termuat dengan benar.
