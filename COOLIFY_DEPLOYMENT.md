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

## 3. Deploy Supabase Self-Hosted
Repositori ini sudah berisi `docker-compose.yml` untuk Supabase. Di Coolify, Anda dapat menggunakan layanan "Docker Compose" deployment:
1. Buat *resource* baru di Coolify berjenis **Docker Compose**.
2. *Copy-paste* isi file `docker-compose.yml` dari repositori Anda.
3. *Copy-paste* isi `.env.supabase` lokal Anda ke tab **Environment Variables**.
4. Deploy!
