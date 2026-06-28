# Dokumentasi Arsitektur & Panduan Wajib Developer
**Proyek:** Beragam Sewa Bali (Web Profile, Cashflow, Dashboard, Admin)  
**Infrastruktur:** Self-Hosted Supabase via Docker Compose di Coolify VPS  

Dokumen ini disusun berdasarkan analisis mendalam dari insiden migrasi terakhir. Dokumen ini **wajib dibaca dan dipatuhi** oleh developer mana pun (termasuk AI) sebelum melakukan pengembangan, modifikasi, atau penambahan sistem baru pada ekosistem server ini.

---

## 1. Analisis Insiden Migrasi (Post-Mortem)

**Masalah yang Terjadi:**  
Setelah memigrasi infrastruktur ke Supabase Self-Hosted di Coolify, halaman website tidak menampilkan data (kosong/me-return `{}`), gambar gagal dimuat (404/500), dan koneksi database Express.js (`api-bsb`) sering kali terputus (*timeout/ENOTFOUND*).

**Akar Penyebab (Root Causes):**
1. **Kesalahan Jaringan (Networking & DNS Docker):** Aplikasi Node.js mencoba mengakses database menggunakan *hostname* kontainer lama (`db-h46...`) yang berubah UUID-nya setiap kali Coolify melakukan *redeploy*. Karena kontainernya baru, *hostname* lama tidak ditemukan (*ENOTFOUND*).
2. **Penolakan SSL Internal:** Saat beralih memanggil IP internal Docker (`172.17.0.1`), aplikasi `pg` (Postgres Node.js) secara default memaksa negosiasi sertifikat SSL (HTTPS). Karena koneksi di dalam perut server (Docker internal) berjalan tanpa enkripsi SSL, koneksi ditolak secara mentah-mentah oleh server database.
3. **Rollback Otomatis Saat Import SQL (Jebakan Transaksi):** Saat mencoba mengembalikan data dari file `latest_schema.sql`, file tersebut mengandung perintah pembuatan skema bawaan (seperti `auth` dan `storage`). Karena Supabase baru sudah memilikinya, sistem mendeteksi konflik (`schema already exists`) lalu Postgres memicu fitur proteksinya: **membatalkan (Rollback) seluruh isi file**, menyebabkan tabel `site_content` Anda tetap kosong.

**Resolusi:**  
Kita memperbaiki jaringan dengan memaksa `api-bsb` menembak *Gateway IP* bawaan Docker (`172.17.0.1`) dengan fitur SSL dinonaktifkan secara spesifik. Lalu, kita menyedot *murni isi data saja* (hanya skema `public`) langsung dari Supabase Cloud dan menyuntikkannya ke *instance* lokal tanpa membawa skema sistem.

---

## 2. ATURAN WAJIB (Spesifik Proyek Beragam Sewa Bali)
Aturan ini berlaku mutlak untuk pengembangan sistem internal saat ini seperti **Aplikasi Cashflow, Dashboard Admin, dan sistem inventaris**.

### A. Aturan Routing & Koneksi API (Frontend vs Backend)
*   **Sistem Frontend (Sisi Klien/Browser):** Segala *fetch* yang berjalan di HP/PC pengguna (React CSR, HTML Statis, Next.js Client Components) **WAJIB** menembak URL Publik ber-SSL: `https://api.beragamsewabali.com`. Jangan pernah memasukkan IP lokal (`172.17...`) di kode *frontend*.
*   **Sistem Backend (Sisi Server/Coolify):** Segala komunikasi antar-server (Next.js SSR, Express.js `api-bsb`, sinkronisasi Cashflow) **WAJIB** menggunakan IP Gateway Internal Docker: `http://172.17.0.1:<PORT>`. Ini sangat mempercepat performa karena data tidak perlu keluar ke *router* internet dunia lalu masuk lagi ke server.

### B. Aturan Koneksi Database (pg Pool / Prisma / Drizzle)
Saat aplikasi Anda memanggil langsung database Postgres, gunakan pengaturan *fallback* yang cerdas ini pada koneksi Anda:
1. Panggil URL dengan format: `postgresql://postgres:<PASSWORD>@172.17.0.1:5435/postgres`
2. **NONAKTIFKAN SSL UNTUK INTERNAL:** Modifikasi modul *driver* database (seperti `pg` di Express) agar mendeteksi jika Host-nya adalah `172.17.0.1` atau `localhost`, maka `ssl: false` (atau hapus properti SSL). Jika tidak, Anda akan mendapat error 500 "Server does not support SSL".

### C. Pembatasan Modifikasi Supabase (Schema Rules)
*   **Hanya Gunakan Skema `public`:** Seluruh tabel baru untuk aplikasi Cashflow, Dashboard, dll. **WAJIB** dibuat di dalam skema `public`. 
*   **Jangan Sentuh Skema Sistem:** Dilarang keras melakukan *Alter Table* atau *Drop* pada tabel di dalam skema `auth`, `storage`, atau `realtime`. Supabase mengatur tabel ini secara ketat, dan merusaknya akan menyebabkan API Kong dan sistem otentikasi hancur.

---

## 3. ATURAN WAJIB (Arsitektur Ekosistem Coolify & Docker)
Aturan ini berlaku untuk masa depan jika Anda membangun aplikasi atau *startup* lain yang ingin digabung di server (VPS) yang sama menggunakan arsitektur Coolify ini.

### A. Aturan Backup, Dump & Migrasi (SANGAT KRUSIAL)
Jika suatu saat Anda ingin menyalin data database ini ke server/proyek lain:
*   **DILARANG:** Melakukan *Full Database Dump* biasa melalui pgAdmin, DBeaver, atau `pg_dumpall`. Itu akan membawa skema `auth` dan merusak Supabase tujuan saat di- *import*.
*   **WAJIB:** Menggunakan format *Data-Only* spesifik ke skema `public`. Simpan perintah ini sebagai SOP utama:
    ```bash
    pg_dump "KONEKSI_URL_SUMBER" --schema=public --data-only --inserts > backup_bersih.sql
    ```
    Lalu jalankan `cat backup_bersih.sql | docker exec -i <ID_CONTAINER_TUJUAN> psql -U postgres -d postgres`

### B. Ketahanan Data (Docker Volumes)
*   Coolify mengikat nama *Docker Volume* dengan nama folder proyek atau nama UUID aplikasi. 
*   **Jika Anda Menghapus Aplikasi di Coolify:** Datanya (Volume) **TIDAK** otomatis terhapus (Kecuali Anda mencentang "Delete Volumes"). Harddisk (Volume) ini akan menjadi yatim piatu (*orphaned*). Anda bisa memasangnya ( *mount*) kembali ke aplikasi Docker baru dengan mendeklarasikannya di `docker-compose.yml` sebagai `external: true`.

### C. Manajemen Environment Variable & Secret
*   Dilarang keras menyematkan (*hardcode*) Service Role Key (JWT Token rahasia Supabase) maupun Password Postgres ke dalam kode program yang di-*commit* ke GitHub.
*   Seluruh *secret* **WAJIB** dimasukkan melalui tab "Environment Variables" pada antarmuka pengguna (UI) Coolify. Aplikasi `api-bsb` atau Next.js Anda harus membacanya melalui `process.env.DATABASE_URL` atau `process.env.SUPABASE_SERVICE_ROLE_KEY`.

### D. Skala & Kinerja API Gateway (Kong)
*   Semua fitur otentikasi (Auth) dan Storage tidak pernah berkomunikasi langsung dengan PostgREST (API Database Supabase). Semuanya di- *proxy* melalui Kong (API Gateway) yang berjalan di port `8001` (Internal) / `8443` (Eksternal). 
*   Jika aplikasi Anda (seperti Next.js Cashflow) perlu memanipulasi *file upload* Storage dari *backend* server, pakailah URL *endpoint* internal `http://172.17.0.1:8001/storage/v1/` untuk menghindari antrean jaringan (*network bottleneck*).
