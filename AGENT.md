# Panduan Pengembangan Ekosistem Beragam Sewa Bali (Agent Guidelines)

Dokumen ini adalah **Aturan Mutlak (System Prompt/Guidelines)** bagi Agent AI atau Developer manusia yang bekerja pada *repository* ini. Proyek ini mencakup ekosistem aplikasi Web Profile, Cashflow, Dashboard, dan sistem internal lainnya.

Setiap kali Anda menerima tugas pada *repository* ini, **BACA DAN PATUHI** batasan-batasan berikut untuk menghindari kerusakan fatal pada infrastruktur atau kehilangan data.

---

## 1. ATURAN MUTLAK: INTEGRITAS DATA & PENGEMBANGAN FITUR

1. **Preservasi Data Utama (NO DATA LOSS)**: Semua data yang saat ini sudah ada di dalam database produksi **TIDAK BOLEH dihapus, ditimpa, atau diganti**. Biarkan data yang sudah ada tetap utuh. Jangan pernah melakukan `DROP TABLE` tanpa persetujuan eksplisit.
2. **Pengembangan Bersifat Aditif (Menambahkan, Bukan Mengurangi)**: Jika ada penambahan fitur baru, lakukan penambahan (*append*) tanpa merusak fungsi atau data lama.
3. **Perubahan Skema/Struktur Database**: Apabila fitur baru memerlukan perubahan struktur data, selalu tambahkan *field* atau *table* baru tanpa membuang *field* lama. **Hanya gunakan skema `public`. DILARANG KERAS memodifikasi atau menghapus skema bawaan Supabase (`auth`, `storage`, `realtime`).** Merusak skema sistem akan menghancurkan API Gateway (Kong) secara permanen.
4. **Keamanan Fitur Transaksi**: Khusus untuk modul Cashflow, segala bentuk pengeditan transaksi/jurnal wajib memastikan *double-entry* tetap valid (keseimbangan Debit & Credit). Data lama harus terjaga layaknya rekam medis.
5. **Akses Pengguna (Role Guest)**: Pengguna dengan role `guest` secara mutlak **dilarang** melihat saldo, laporan keuangan keseluruhan (Neraca Saldo/Lajur), atau data transaksi milik pihak lain (khususnya Owner). Hak mereka dibatasi hanya pada transaksi yang mereka buat sendiri.

---

## 2. ATURAN INFRASTRUKTUR: KONEKTIVITAS COOLIFY & DOCKER

Sistem ini di- *host* menggunakan **Self-Hosted Supabase via Docker Compose di Coolify VPS**.

1. **Koneksi Frontend vs Backend (WAJIB DIBEDAKAN)**:
   - **Frontend (Client-Side, React, HTML Statis)**: Harus selalu melakukan *fetch* data ke URL Publik HTTPS (`https://api.beragamsewabali.com`). Jangan pernah mengekspos IP lokal Docker ke browser klien.
   - **Backend (Server-Side, Express.js `api-bsb`, Next.js SSR)**: Saat di-deploy di Coolify, WAJIB berkomunikasi via **IP Gateway Internal Docker (`172.17.0.1:5435`)** atau host internal Coolify. Ini menghindari *latency* jaringan luar dan menjamin stabilitas jika DNS eksternal bermasalah.
2. **Aturan Negosiasi SSL (pg Node.js)**: 
   - Karena komunikasi internal (`172.17.0.1`) berjalan secara mentah tanpa enkripsi HTTPS eksternal, Anda **WAJIB MENONAKTIFKAN SSL** pada koneksi database (misalnya `ssl: false` pada properti Pool Node.js) apabila host mendeteksi IP lokal tersebut. Jika SSL tetap dipaksa aktif, koneksi akan ditolak dengan error *"Server does not support SSL"*.
3. **Komunikasi Supabase Client Internal**:
   - Untuk SDK `supabase-js` di *backend*, gunakan `SUPABASE_INTERNAL_URL` (`http://172.17.0.1:8001`) yang mengarah ke port internal Kong API Gateway, bukan port PostgREST atau port database secara langsung. Ini memastikan kompatibilitas fitur Auth dan Storage.

---

## 3. ATURAN RECOVERY & DATABASE MIGRATION (SOP)

Jika tugas Anda mengharuskan memindahkan, me- *restore*, atau mem- *backup* database antar Supabase:
1. **DILARANG MENGGUNAKAN FULL BACKUP/DUMP STANDAR**: Penggunaan utilitas *dump* standar yang mengekstrak seluruh skema (termasuk skema `auth` dan `storage`) akan menjadi bumerang. Jika file ini disuntikkan ke lingkungan Supabase baru, Postgres akan membatalkan *transaction* (*Rollback*) sepenuhnya karena bentrok skema (*schema already exists*), dan hasil import data Anda akan bernilai 0 (kosong).
2. **SOP Ekspor Data yang Benar**: 
   Selalu gunakan susunan *flag* khusus untuk menyedot murni *data* dari skema `public` (menggunakan operasi `INSERT` alih-alih `COPY` agar fleksibel):
   ```bash
   pg_dump "KONEKSI_URL_SUMBER" --schema=public --data-only --inserts > backup_bersih.sql
   ```
3. **Ketahanan Volume Docker di Coolify**:
   Saat layanan (kontainer) dihapus dari Dashboard Coolify, *Docker Volume* yang menampung file database dan *storage* **TIDAK** otomatis terhapus (Kecuali opsi *Delete Volumes* dicentang secara manual). Jika Anda tidak sengaja menghapus sebuah proyek, seluruh data bisa dipanggil kembali menggunakan konfigurasi `external: true` pada block `volumes` di `docker-compose.yml`.
---

## 4. ARSITEKTUR DEPLOYMENT & ENVIRONMENT VARIABLES

### Peta Layanan Aktif di Server
| Layanan | Tipe | Port Internal | URL Publik |
|---|---|---|---|
| Supabase Kong (API Gateway) | Docker Compose | `8001` (HTTP), `8443` (HTTPS) | `https://api.beragamsewabali.com` |
| Supabase Postgres (DB) | Docker Compose | `5435` | — (Internal Only) |
| Supabase Auth (GoTrue) | Docker Compose | `9999` | Via Kong |
| Supabase Storage | Docker Compose | `5000` | Via Kong |
| API BSB (Express.js) | Coolify App | `3005` | `https://api.beragamsewabali.com` (proxied) |
| Web Profile (Next.js) | Coolify App | `3000` | `https://www.beragamsewabali.com` |
| BSB Cashflow (Next.js) | Coolify App | `3003` | TBD (assign domain di Coolify) |
| BSB Dashboard (Next.js) | Coolify App | `3002` | TBD (assign domain di Coolify) |

### Aturan Environment Variable per Aplikasi

**Cashflow & Dashboard (Next.js `standalone` mode):**
```env
NEXT_PUBLIC_SUPABASE_URL=https://api.beragamsewabali.com
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE
```
> **PENTING**: `NEXT_PUBLIC_*` harus tersedia saat **build time** karena dibake ke dalam bundle JavaScript.

**API BSB (Express.js):**
```env
DATABASE_URL=postgresql://postgres:your-super-secret-and-long-postgres-password@172.17.0.1:5435/postgres
NODE_ENV=production
PORT=3005
```

- Biarkan Next.js berjalan dalam mode server standar. JANGAN gunakan `output: "export"` atau `"standalone"`. Mode standar memungkinkan Next.js untuk mengatur file statis dan routing otomatis.
- JANGAN gunakan `turbopack.root` dengan `path.resolve(__dirname, "../../")` — ini menyebabkan error di dalam container Docker karena path monorepo tidak sama dengan path lokal.
- JANGAN hardcode `distDir` ke folder di luar `apps/` — biarkan Next.js menggunakan default `.next/`.

### Aturan Coolify App Settings
- **Build Pack**: Nixpacks
- **Base Directory**: `apps/cashflow` atau `apps/dashboard`
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm run start` (secara internal menjalankan `HOSTNAME=0.0.0.0 next start` agar bisa diakses oleh Nginx/Traefik Docker)
- **Port**: `3000` (Secara default Next.js `standalone` jalan di port 3000, di dalam Docker/Coolify port ini aman karena terisolasi antar kontainer)

---
*Dengan mematuhi panduan agen (Agent Guidelines) ini secara mutlak, kita memastikan bahwa seluruh ekosistem Beragam Sewa Bali (Web, Cashflow, Dashboard, Admin) tetap stabil, anti kehilangan data (No Data Loss), dan infrastruktur dapat dipelihara dengan aman oleh Developer atau AI mana pun di masa depan.*

