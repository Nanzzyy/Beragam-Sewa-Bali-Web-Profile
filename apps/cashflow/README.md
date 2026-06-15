# BSB Cashflow — Double-Entry Ledger System

Sistem akuntansi *double-entry ledger* untuk PT Praven Bali Production. Dibuat dengan Next.js, Tailwind CSS, Supabase, dan ExcelJS.

## Fitur Utama

- **Double-Entry Accounting**: Memastikan setiap transaksi memiliki minimal 2 jurnal entry (Debit & Credit) yang seimbang.
- **Neraca Saldo Real-time**: Kalkulasi neraca saldo otomatis melalui SQL View di Supabase.
- **Export Excel**: Mendukung export ke file Excel (.xlsx) dengan formatting rapi dan formula `SUM` untuk total menggunakan ExcelJS.
- **Role-based Access**: Akses dibatasi berdasarkan *Role* user (Hanya role `owner` dan `accounting` yang memiliki akses modifikasi).

## Teknologi

- **Frontend**: Next.js (App Router), Tailwind CSS
- **Backend/DB**: Supabase (PostgreSQL)
- **Komponen**: Recharts (Chart visualisasi), ExcelJS & file-saver (Export Excel)

## Struktur Folder
- `/app` - Halaman-halaman Next.js (Dashboard utama).
- `/components` - Komponen React yang *reusable* seperti `TransactionModal` dan `ExcelExportButton`.
- `/lib` - Konfigurasi dan *logic* (Supabase client & Accounting engine).

## Cara Menjalankan Secara Lokal

1. Copy file `.env.local.example` (jika ada) ke `.env.local` atau buat file `.env.local`.
2. Isi `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
3. Jalankan perintah `npm run dev` (atau `pnpm dev`, `yarn dev`).
4. Buka [http://localhost:3000](http://localhost:3000) di browser.

## Catatan Database / Supabase
Pastikan Anda sudah mengeksekusi script SQL Schema di `supabase_cashflow_schema.sql` pada proyek Supabase Anda sebelum menggunakan aplikasi ini. Script tersebut akan membuat tabel, trigger, dan views yang dibutuhkan.
