# Beragam Sewa Bali - Enterprise Resource Planning (ERP) System

> **⚠️ PRIVATE REPOSITORY / INTERNAL USE ONLY**
> Platform ini adalah sistem internal milik **Beragam Sewa Bali**. Sistem ini **TIDAK UNTUK PENGGUNAAN PUBLIK**. Segala bentuk akses tanpa izin, distribusi, atau penyalahgunaan kode sumber ini dilarang keras.

Sistem *Point of Sale* (POS), penyewaan, dan manajemen inventaris komprehensif yang dirancang khusus untuk operasional penyewaan peralatan *event* di Bali. Aplikasi ini menyediakan alat yang terpusat untuk manajemen inventaris, pelacakan pesanan sewa, laporan keuangan, dan manajemen akses staf.

## ✨ Fitur Utama

### 📦 Manajemen Inventaris (Inventory Management)
- **Katalog Barang**: Mengelola seluruh daftar barang sewa dengan perhitungan kuantitas yang otomatis tersinkronisasi.
- **Ketersediaan Real-Time**: Ketersediaan stok dihitung secara otomatis berdasarkan pemakaian barang di lapangan.
- **Manajemen Kategori & Vendor**: Melacak *supplier* penyedia barang dan pengelompokan barang.

### 🤝 Manajemen Sewa (Rental & Job Management)
- **Siklus Penyewaan Lengkap**: Mengelola permintaan penyewaan, konfirmasi, penyusunan staf, hingga penyelesaian acara.
- **Gantt Chart Jadwal**: Visualisasi jadwal *event* secara *real-time* dengan mode harian dan mingguan.
- **Surat Jalan & Invoice**: Menghasilkan dokumen PDF secara otomatis dengan kop surat dan logo perusahaan yang dapat disesuaikan.
- **Bukti Pengiriman & Pengembalian**: Mengunggah foto bukti serah terima dan pengembalian barang langsung ke *cloud storage*.

### 💰 Pencatatan Keuangan (Financial Tracking)
- **Cashflow Ledger**: Melacak seluruh transaksi finansial (Pemasukan & Pengeluaran) menggunakan metode *double-entry accounting*.
- **Sinkronisasi Jurnal**: Pendapatan dari penyewaan otomatis tercatat di sistem pembukuan saat status dikonfirmasi.
- **Dashboard Statistik**: Metrik finansial bulanan yang mudah dipahami (Total Pemasukan, Total Pengeluaran, Saldo Bersih).

### 👥 Manajemen Staf & Akses (RBAC)
- Tiga tingkat hak akses yang aman:
  - **Owner**: Akses penuh ke seluruh fitur sistem, manajemen staf, pengaturan *template* dokumen, dan pembukuan absolut.
  - **Accounting**: Akses ke manajemen jurnal kas dan persetujuan pencatatan.
  - **Staff**: Akses operasional untuk mengelola status barang, kru, dan unggah foto bukti.

## 🛠️ Teknologi yang Digunakan

Platform ini dibangun dengan teknologi *modern web*:
- **Frontend/Framework**: Next.js (App Router), React, TypeScript
- **Styling**: Tailwind CSS, Lucide Icons
- **Backend & Database**: Supabase (PostgreSQL, Row-Level Security, Real-time WebSockets, Cloud Storage)
- **Generasi Dokumen**: jsPDF, autoTable

---
*Copyright © 2026 Beragam Sewa Bali. All rights reserved.*