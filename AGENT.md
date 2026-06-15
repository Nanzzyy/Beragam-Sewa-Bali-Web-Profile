# Panduan Pengembangan (Development Guidelines)

**PENTING: ATURAN MUTLAK TERKAIT INTEGRITAS DATA**

Ketika melakukan pengembangan, penambahan fitur, atau modifikasi apa pun pada website ini di masa mendatang, Anda **DIWAJIBKAN** untuk mematuhi aturan berikut secara ketat:

1. **Preservasi Data Utama**: Semua data yang saat ini sudah ada di dalam website **TIDAK BOLEH dihapus, ditimpa, atau diganti**. Biarkan data yang sudah ada tetap utuh seperti apa adanya sekarang.
2. **Pengembangan Bersifat Aditif (Menambahkan, Bukan Mengurangi)**: Jika ada penambahan fitur baru apa pun, lakukan penambahan (*append*) tanpa merusak atau menghilangkan fungsionalitas dan data lama. Fitur baru harus diimplementasikan dengan cara menambahkan kode/data baru, bukan menghapus atau mengubah data yang sudah berjalan.
3. **Integritas Sistem (Sesuai Standar Cashflow)**: Layaknya pengembangan pada proyek *cashflow*, data lama harus selalu dijaga sebagai data permanen yang tidak tergantikan.
4. **Perubahan Skema/Struktur**: Apabila fitur baru memerlukan perubahan struktur data, pastikan untuk menambahkan *field* atau skema baru tanpa membuang atau memodifikasi *field* lama yang telah ada nilainya.
5. **Akses Pengguna (Role Guest)**: Pengguna dengan role `guest` secara mutlak **tidak diperbolehkan** melihat saldo, laporan keuangan secara keseluruhan (seperti Neraca Saldo, Neraca Lajur, dll), aktiva tetap, atau data transaksi yang dibuat oleh pengguna lain (khususnya milik Owner). Hak akses mereka dibatasi hanya pada data transaksi yang mereka buat sendiri.
6. **Keamanan Fitur Edit Transaksi**: Ketika melakukan edit transaksi/jurnal, pastikan proses penghapusan entri jurnal lama dan penyisipan entri jurnal baru dilakukan secara aman. Semua validasi double-entry (keseimbangan Debit & Credit, validasi akun, dll) wajib terpenuhi sebelum perubahan disimpan ke database.

Aturan ini dibuat untuk memastikan website yang berjalan sekarang tidak mengalami kehilangan data penting selama proses penambahan atau pembaruan sistem di kemudian hari.
