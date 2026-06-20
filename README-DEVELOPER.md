# Beragam Sewa Bali - Developer & Server Setup Guide

This document is intended for developers, testers, and system administrators responsible for maintaining, testing, and deploying the Beragam Sewa Bali platform.

## 🛠 Prerequisites

Before you begin, ensure your local environment meets the following requirements:
- **Docker Desktop** (or Docker Engine + Docker Compose v2)
- **Node.js** (v18 or higher)
- **pnpm** (Package manager used for this monorepo)
- **Git**

## 🚀 "One-Click" Quick Start Local Setup

Follow these steps to boot up the entire infrastructure locally:

1. **Environment Setup**
   Copy the example environment files to their active locations:
   ```bash
   cp .env.example .env
   cp apps/cashflow/.env.local.example apps/cashflow/.env.local
   cp apps/dashboard/.env.local.example apps/dashboard/.env.local
   ```
   *(Note: You must edit `.env` to set secure passwords and JWT secrets before starting the database for the first time).*

2. **Booting up Infrastructure**
   Start the self-hosted Supabase Docker stack in the background:
   ```bash
   docker compose up -d
   ```

3. **Database Schema Injection**
   Inject the core database schema into the newly created local PostgreSQL container. We use the extracted `latest_schema.sql` file:
   ```bash
   docker exec -i supabase-db psql -U postgres -d postgres < latest_schema.sql
   ```

4. **Running the Next.js Development Servers**
   Install dependencies and start the frontend applications:
   ```bash
   pnpm install
   
   # Run the workspaces
   npm run dev:web
   npm run dev:dashboard
   npm run dev:cashflow
   
   # Run the Express API (Needed for Landing Page backwards compatibility)
   node --watch api/index.js
   ```

## 🔌 Port Mapping Table

When running locally, the services are mapped to the following explicit ports to avoid conflicts:

- **`http://localhost:8000`** - Kong API Gateway / Local Supabase REST Endpoint & Auth
- **`http://localhost:5434`** - Local PostgreSQL Database (Exposed to host as `5435`)
- **`http://localhost:3005`** - Express API Backend (`api/index.js`)
- **`http://localhost:3001`** - Apps/Web (Landing Page Next.js Dev Server)
- **`http://localhost:3002`** - Apps/Dashboard
- **`http://localhost:3003`** - Apps/Cashflow

## 🌐 Cloudflare Tunnel Deployment Guide

To expose the local development environment securely to the internet for remote testing or temporary admin access, we use Cloudflare Tunnels (`cloudflared`).

### 1. Install `cloudflared`
Download the standalone binary for Linux:
```bash
curl -L --output cloudflared https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64
chmod +x cloudflared
```

### 2. Authenticate (If using a permanent domain)
```bash
./cloudflared tunnel login
```

### 3. Exposing Ports
To quickly expose the landing page (which automatically proxies `/api` requests to the Express backend):
```bash
./cloudflared tunnel --url http://localhost:3001
```

*(Note: To map multiple subdomains like `dashboard.beragamsewabali.com` to `localhost:3002`, you must create a `config.yml` file and define ingress rules as per the [Cloudflare Documentation](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/tunnel-guide/local/local-management/ingress/)).*

### 4. Running as a System Service (Production Server only)
```bash
sudo ./cloudflared service install
sudo systemctl start cloudflared
sudo systemctl enable cloudflared
```

---

## 🛑 Fallback Mechanism & Schema Dumps

If a critical database error occurs, you can easily restore the local schema. 
To generate a new schema snapshot before committing major structural changes:

```bash
docker exec -i supabase-db pg_dump -U postgres -d postgres --schema-only > latest_schema.sql
```
This ensures developers always have a clean, reproducible database state.
