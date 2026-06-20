# Beragam Sewa Bali - Event Essentials Platform

Welcome to the **Beragam Sewa Bali** platform! We are your premier, synchronized ecosystem for event essentials in Bali. Whether it's a corporate gathering, an intimate wedding, or a massive concert, we provide a unified solution for all your event needs.

## 🚀 Core Architecture

Our platform is built on a modern, robust, and scalable technology stack:

- **Frontend:** Next.js & TypeScript
- **Styling:** Tailwind CSS v4 (Pure Tailwind, no legacy Bootstrap)
- **Backend & Database:** Dockerized Self-Hosted Supabase (PostgreSQL, Go true, PostgREST)
- **Deployment:** Vercel (Frontend & Serverless API) & Local Docker Swarm

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

*For technical documentation and deployment instructions, please refer to [README-DEVELOPER.md](./README-DEVELOPER.md).*
