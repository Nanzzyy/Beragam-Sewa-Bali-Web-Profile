# Local Development — Clone Produksi ke Supabase Docker Lokal

Panduan menjalankan seluruh ekosistem (Web Profile, Cashflow, Dashboard, Express API) secara **lokal** dengan **data hasil clone dari produksi**, untuk develop & menguji upgrade sistem **tanpa menyentuh data produksi**.

> Patuh `AGENT.md` §1 (NO DATA LOSS): produksi hanya dibaca (`pg_dump`); semua tulisan hanya ke container Supabase lokal. Data `public` saja yang di-clone — schema `auth`/`storage`/`realtime` tidak disentuh.

---

## Arsitektur singkat

```
Laptop (local dev)
├─ apps/web, apps/cashflow, apps/dashboard  ──(supabase-js, anon key)──►  Supabase Docker lokal (Kong :8001)
└─ api/index.js (Express :3005)             ──(pg, DATABASE_URL)──────►  Postgres lokal (container supabase-db :5432)
                                          │
                                          └─ data = clone produksi (di-refresh berkala via dev-clone-prod.sh)
```

Frontend apps pakai `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` (key **lokal**, bukan prod).
Express API pakai `DATABASE_URL` ke Postgres lokal (`localhost:5435`, `ssl:false` otomatis karena host `localhost`).

---

## Prasyarat

- Docker + Docker Compose v2
- Node 18+, npm workspace (sudah ada `package.json` root)
- Akses SSH ke server produksi (alias `server` di `~/.ssh/config`, atau set `SSH_HOST`)
- **Plugin `docker-buildx`** — wajib. Compose v2 butuh buildx untuk build image `db`/`kong`/`studio`/`supavisor`. Cek: `docker buildx version`. Bila hilang, install: `sudo pacman -S docker-buildx` (CachyOS/Arch) ATAU tanpa sudo: download binary ke `~/.docker/cli-plugins/docker-buildx` dari https://github.com/docker/buildx/releases.

---

## Setup sekali jalan

### 1. Siapkan `.env` root (secrets stack lokal)

```bash
cp .env.example .env
sh utils/generate-keys.sh --update-env   # isi JWT_SECRET, ANON_KEY, SERVICE_ROLE_KEY, POSTGRES_PASSWORD, dll
```

Catat **SERVICE_ROLE_KEY** & **ANON_KEY** lokal (dipakai di langkah berikut).

### 2. Tambahkan section Express API (local) di akhir `.env`

```env
# ── Express API: local dev terhadap Supabase Docker lokal ──
DATABASE_URL=postgresql://postgres:<POSTGRES_PASSWORD_SAMA_DIATAS>@localhost:5435/postgres
SUPABASE_URL=http://localhost:8001
SERVICE_ROLE_KEY=<SERVICE_ROLE_KEY_LOKAL>
NODE_ENV=development
```

> `db.js` mendeteksi `localhost` → otomatis `ssl:false` (hindari error "Server does not support SSL").

### 3. Buat volume eksternal (sekali)

docker-compose.yml ini pakai volume `external:true` (nama hash Coolify). Buat sekali di laptop:

```bash
for v in db-config deno-cache db-data storage-data; do
  docker volume create "h46kluhqstf23qr75qhw50eu_$v"
done
```

### 4. Start stack Supabase lokal

```bash
sh run.sh start
```

> Bila `realtime` `unhealthy` tapi `db`/`auth`/`rest`/`kong`/`storage` healthy → abaikan (realtime tak dipakai cashflow/dashboard). `START_EXIT:1` dari `--wait` hanya karena realtime; stack tetap jalan.

### 5. Clone schema + data produksi → lokal (read-only di prod)

```bash
npm run dev:clone          # = sh scripts/dev-clone-prod.sh
```

Script ini drift-proof: dump **schema** public prod (dengan GRANT & RLS) → DROP+rebuild schema public lokal → dump **data** prod → load (`session_replication_role=replica`, bypass urutan FK) → re-apply GRANT standar → re-create trigger `on_auth_user_created`. **Tidak perlu `latest_schema.sql`; schema selalu ikut prod. Produksi tidak ditulis.**

### 6. Buat user dev lokal (untuk login)

```bash
npm run dev:user           # = node scripts/dev-create-user.js
# default: dev@beragamsewabali.com / devpass123, role owner
# ubah: DEV_USER_EMAIL=aku@mail.com DEV_USER_PASSWORD=rahasia npm run dev:user
```

User ini hanya ada di lokal. Trigger versi-prod hardcode role `guest`, jadi script eksplisit UPDATE ke `owner` → bisa melihat seluruh data hasil clone (sesuai RLS).

---

## Menjalankan app

```bash
npm run dev:all            # API + Web + Cashflow + Dashboard sekaligus
# atau per app:
npm run dev:cashflow       # API + Cashflow (port 3003)
npm run dev:dashboard      # API + Dashboard (port 3002)
npm run dev:web            # API + Web (port 3001)
```

Port lokal: Web 3001 · Dashboard 3002 · Cashflow 3003 · Express API 3005 · Kong 8001 · Postgres 5435.

### `.env.local` tiap app

Buat `apps/<app>/.env.local` dari contoh:

```env
NEXT_PUBLIC_SUPABASE_URL=http://localhost:8001
NEXT_PUBLIC_SUPABASE_ANON_KEY=<ANON_KEY_LOKAL>
```

(Contoh sudah ada di `apps/cashflow/.env.local.example`, `apps/dashboard/.env.local.example`, `apps/web/.env.local.example`.)

---

## Sinkronisasi ulang dari produksi

Setiap kali butuh schema/data prod terbaru:

```bash
npm run dev:clone      # DROP+rebuild schema public + reload data (drift-proof)
npm run dev:user       # buat ulang user dev (profiles ikut ter-drop saat clone)
```

Urutan penting: **clone dulu, baru create user** — karena clone mem-DROP schema `public` (termasuk `profiles`).

---

## Upgrade sistem (alur aman)

1. Clone data prod terbaru → lokal.
2. Lakukan upgrade (versi Next/Node/Supabase, refactor, migrasi schema **additif**).
3. Uji semua flow di lokal dengan data nyata.
4. Setelah stabil, deploy ke Coolify. Bila butuh perubahan schema produksi → ikut SOP `AGENT.md` §1–3 (field/tabel baru, tidak drop).

---

## Stop / reset stack lokal

```bash
sh run.sh stop           # hentikan container (volume data tetap)
sh run.sh recreate       # force-recreate container
# reset total data lokal: hapus volume lalu ulangi langkah setup 3–5
```

---

## Troubleshooting

| Gejala | Penyebab / solusi |
|---|---|
| `Docker Compose requires buildx plugin` | Install `docker-buildx` (lihat Prasyarat). |
| `external volume "..." not found` | Buat volume eksternal sekali (lihat Setup langkah 3). |
| `unable to evaluate symlinks in Dockerfile path` | Buildx belum terpasang → compose pakai classic builder. |
| `Server does not support SSL` | `DATABASE_URL` memakai host non-`localhost`. Pakai `localhost:5435` agar `db.js` set `ssl:false`. |
| REST 403 `permission denied for table` | GRANT hilang. Clone script sudah apply otomatis; bila manual: `GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;` |
| Login gagal setelah clone | User dev belum dibuat pasca-clone. Jalankan `npm run dev:user`. |
| Role jadi guest | Trigger prod hardcode `guest`. `dev:user` UPDATE ke owner; bila gagal jalankan SQL di pesannya. |
| `realtime` unhealthy | Abaikan — tak dipakai cashflow/dashboard. |
| Clone error "container not found" | Set `PROD_DB_CONTAINER` manual. Cari nama: `ssh server "docker ps"`. |
| App masih hit prod | `.env.local` memakai URL prod. Pastikan `NEXT_PUBLIC_SUPABASE_URL=http://localhost:8001`. |

---

## Catatan keamanan

- `SERVICE_ROLE_KEY` lokal ≠ produksi. Jangan campur. Script `dev-create-user.js` menolak jalan bila `SUPABASE_URL` terdeteksi domain prod.
- Dump prod (`dev-prod-dump.sql` berisi data nyata, `dev-prod-schema.sql` hanya struktur) → jangan commit. Sudah di-gitignore via pola `dev-prod-*.sql`. Hapus setelah load bila mau: `rm dev-prod-*.sql`.
- Tidak pernah ada operasi tulisan ke produksi dari alur ini.
