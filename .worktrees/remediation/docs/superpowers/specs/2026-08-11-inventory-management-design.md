# Inventory Management & Growth Features (Sprint 3)

## 1. Stok Opname (Structured Flow)
Fitur opname stok akan menggunakan pendekatan terstruktur (Draft & Approval) untuk menjamin akurasi dan riwayat selisih barang.

**Alur Kerja:**
1. Pengguna memulai "Sesi Opname" baru.
2. Pengguna memasukkan stok fisik (aktual). Terdapat dua mode input hibrida:
   - **Mode Daftar:** Menggunakan tombol `+` / `-` yang besar atau klik untuk mengetik angka secara manual (ramah lansia).
   - **Mode Scanner:** Tombol untuk membuka kamera HP (atau menghubungkan barcode scanner bluetooth) untuk scan barcode barang. Auto-increment jumlah setiap kali scan berhasil.
3. Sistem membandingkan stok fisik dengan stok tercatat (sistem).
4. Sesi disimpan sebagai Draft. Pengguna dapat me-review "Selisih Stok".
5. Pengguna menyetujui (Approve) sesi opname, yang kemudian akan memperbarui stok utama di database dan mencatat riwayat penyesuaian.

## 2. CSV Export Module
Sistem akan menyediakan fitur unduh data dalam format CSV yang kompatibel dengan Microsoft Excel untuk memudahkan pembukuan dan operasional manual.

**Modul Export yang Didukung:**
1. **Laporan Transaksi / Penjualan:** Data transaksi per periode (harian/bulanan) mencakup tanggal, total nilai, diskon, dan metode pembayaran.
2. **Daftar Stok & Harga Barang:** Master data produk (SKU, Nama, Harga Jual, Stok) yang berguna untuk pencetakan label rak atau pricelist.
3. **Riwayat Stok Opname:** Laporan hasil selisih dari sesi Stok Opname yang pernah dilakukan.

## 3. Stock Alert & Daily Digest Notification
Sistem peringatan stok menipis (Low Stock Alert) akan diintegrasikan dengan fitur Daily Digest untuk menghindari notifikasi berlebihan (spam).

**Alur Kerja:**
1. **Dashboard Alert:** Peringatan visual (badge/banner) akan muncul di Dashboard saat pengguna login jika ada barang yang mendekati batas minimum stok.
2. **WhatsApp Daily Digest:** Setiap sore/malam (jadwal dapat diatur), sistem akan mengirimkan SATU pesan ringkasan harian via WhatsApp Business API. Pesan ini berisi:
   - Total penjualan hari itu.
   - Daftar barang yang stoknya sudah menipis/habis dan perlu di-restock (rekap dari Stock Alert).

## Arsitektur & Perubahan Database
- **Tabel `StockOpname` (Baru):** Menyimpan metadata sesi opname (id, status: DRAFT/APPROVED, tanggal).
- **Tabel `StockOpnameItem` (Baru):** Menyimpan detail tiap barang (opnameId, productId, stokSistem, stokFisik, selisih).
- **Penyesuaian `Product`:** Menambahkan kolom `minimumStock` untuk trigger Stock Alert (default: 5).
- **Service Ekspor CSV:** Membuat rute API `/api/v1/export/csv` yang merespon dengan header `text/csv`.
- **Integrasi WhatsApp:** Membuat cron job atau scheduled API endpoint (misal: menggunakan platform cron Vercel atau Supabase Edge Functions) untuk memicu pengiriman Daily Digest melalui vendor WhatsApp API.

## Pengujian (Testing Plan)
- Uji coba mode Scanner Barcode di peramban mobile (iOS/Android).
- Verifikasi keamanan rute CSV Export (hanya admin/pemilik yang bisa akses).
- Uji perhitungan selisih stok (stok negatif, penambahan, penghapusan).
