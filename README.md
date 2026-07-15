# Beragam Sewa Bali - Event Essentials Platform

Welcome to the **Beragam Sewa Bali** platform! We are your premier, synchronized ecosystem for event essentials in Bali. Whether it's a corporate gathering, an intimate wedding, or a massive concert, we provide a unified solution for all your event needs.

## 🚀 Core Architecture

Our platform is built on a modern, robust, and scalable technology stack:

- **Frontend:** Next.js & TypeScript
- **Styling:** Tailwind CSS v4 (Pure Tailwind, no legacy Bootstrap)
- **Backend & Database:** Dockerized Self-Hosted Supabase (PostgreSQL, Go true, PostgREST)
- **Deployment:** Coolify (auto-deploy dari Git) — self-hosted Supabase via Docker Compose

This architecture ensures blazing-fast load times, complete data ownership, and a seamless experience across all devices.

## ✨ Key Features

The Beragam Sewa Bali platform is divided into four main ecosystems:

### 1. Landing Page (`apps/web`)
A highly optimized, SEO-friendly public face of our business. It features dynamic content loading, extreme performance optimization, and an interactive catalog for potential clients to browse our services and packages.

### 2. Admin Manager (`/admin`)
A secure, role-based portal for updating website content, uploading new gallery images, and managing the public catalog directly from the database without requiring code deployments.

### 3. Dashboard Panel (`apps/dashboard`)
Our internal ERP (Enterprise Resource Planning) system. It features:
- Interactive Gantt chart scheduling to avoid booking conflicts.
- Real-time inventory tracking and availability management.
- Staff role assignment and job tracking.
- Automated document generation (Invoices & Delivery Orders).

### 4. Cashflow Management (`apps/cashflow`)
A double-entry accounting system fully integrated with the Dashboard. Every completed job automatically syncs into the ledger, ensuring accurate financial reporting, PnL generation, and vendor cost tracking.

---

## 💻 Menjalankan Secara Local (dengan data produksi)

Stack Supabase Docker lokal di-clone dari produksi (read-only di prod), sehingga develop & uji upgrade **tanpa menyentuh data produksi**.

### Peta port lokal

| App | Port | Perintah dev |
|---|---|---|
| Express API (`api/`) | `3005` | `npm run dev:api` |
| Web Profile (`apps/web`) | `3000` | `npm run dev:web:only` |
| Cashflow (`apps/cashflow`) | `3001` | `npm run dev:cashflow:only` |
| Dashboard (`apps/dashboard`) | `3002` | `npm run dev:dashboard:only` |
| Supabase Kong (gateway) | `8001` | otomatis via `run.sh` |
| Supabase Postgres | `5435` | otomatis via `run.sh` |

### Setup sekali (pertama kali)

Detail lengkap di [`dev-doc/LOCAL-DEV.md`](./dev-doc/LOCAL-DEV.md). Inti:

```bash
cp .env.example .env && sh utils/generate-keys.sh --update-env  # generate secrets lokal
# isi section Express API di .env + buat 4 volume external (lihat LOCAL-DEV.md)
sh run.sh start         # start stack Supabase lokal
npm run dev:clone       # clone schema + data produksi (read-only)
npm run dev:user        # buat user dev lokal (role owner)
```

Login dev: `dev@beragamsewabali.com` / `devpass123`.

### Daily run — satu command

```bash
npm run dev:start
```

Otomatis: (1) memastikan stack Supabase hidup, lalu (2) menjalankan **API + Web + Cashflow + Dashboard** bersamaan di foreground. Tekan **Ctrl-C sekali** untuk menghentikan keempat app. Stack Docker tetap hidup; stop total dengan `npm run dev:down`.

Buka: <http://localhost:3000> (web) · <http://localhost:3001> (cashflow) · <http://localhost:3002> (dashboard) · API di `:3005`.

Refresh data dari produksi kapan saja:
```bash
npm run dev:clone && npm run dev:user
```

> 📖 **Troubleshooting & prasyarat (buildx, volume, SSL): [`dev-doc/LOCAL-DEV.md`](./dev-doc/LOCAL-DEV.md)**

---

## 🚀 Update & Deploy ke Produksi (workflow AI Agent / Developer)

Produksi di-host di **Coolify** yang terhubung langsung ke repo Git ini (`origin` → GitHub). Setiap `git push` ke `main` memicu Coolify **auto-deploy** (clone repo → build → restart app). Jadi **"push ke produksi" = push kode ke `main`**.

### Alur standar

1. **Edit & uji lokal** — `npm run dev:start`. Pastikan semua app jalan & DB terhubung (cek `/api/health` dan `/api/content` di `:3005`).
2. **Commit** — jangan pernah commit `.env`, `*.sql`, atau hasil build (semuanya sudah di `.gitignore`).
   ```bash
   git add <file_yg_diubah>
   git commit -m "fix/feat: ... "
   ```
3. **Push** — Coolify auto-deploy tiap app (web, api, dashboard, cashflow).
   ```bash
   git push origin main
   ```
4. **Pantau** di dashboard Coolify — lihat status build & healthy tiap service.

### Aturan mutlak (selengkapnya di [`AGENT.md`](./AGENT.md))

- **NO DATA LOSS**: data produksi tidak boleh dihapus/ditimpa. Perubahan bersifat aditif (tambah, bukan kurang).
- **Skema `public` saja**: dilarang memodifikasi skema bawaan Supabase (`auth`, `storage`, `realtime`) — akan menghancurkan API Gateway Kong permanen.
- **`.env` & `*.sql` tidak pernah di-commit**. Di produksi, rahasia di-inject lewat tab *Environment Variables* Coolify (fitur "Paste .env").
- **Backend** berkomunikasi via IP gateway internal Docker (`172.17.0.1`) dengan `ssl:false`; **frontend** pakai URL publik HTTPS (`https://api.beragamsewabali.com`).
- Cashflow wajib menjaga **double-entry** seimbang (Debit = Credit).

### Perubahan skema DB di produksi

File SQL dump (mis. `latest_schema.sql`) diabaikan git, jadi tidak ikut ter-deploy. Jalankan manual:
- via DBeaver/TablePlus ke Postgres yang di-expose Coolify, atau
- SSH ke server lalu `./scripts/coolify_restore_db.sh /path/to/file.sql`

Detail deploy per-app & self-host Supabase di Coolify: [`COOLIFY_DEPLOYMENT.md`](./COOLIFY_DEPLOYMENT.md).

---

*For technical documentation and deployment instructions, please refer to [README-DEVELOPER.md](./README-DEVELOPER.md).*
