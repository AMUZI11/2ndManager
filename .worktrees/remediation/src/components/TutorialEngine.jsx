"use client";
import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { HelpCircle, ChevronRight, ChevronLeft, X, CheckCircle } from 'lucide-react';
import { api } from '../utils/api';

const TutorialContext = createContext(null);

export const useTutorial = () => useContext(TutorialContext);

// Steps configuration for Onboarding Tour (8 steps)
const ONBOARDING_STEPS = [
  {
    targetId: null, // Center modal
    title: "Selamat Datang di HL Manager!",
    content: "Kami akan bantu Bapak/Ibu mengenal aplikasi ini dalam 2 menit. Klik MULAI untuk memulai panduan singkat.",
    actionLabel: "MULAI"
  },
  {
    targetId: "tour-dashboard-stats",
    title: "Ini Ringkasan Bisnis Anda",
    content: "Di sini Bapak/Ibu bisa melihat total piutang, penjualan lunas, dan keuntungan bersih secara real-time. Semuanya dihitung otomatis!"
  },
  {
    targetId: "tour-bonus-alerts",
    title: "Notifikasi Bonus",
    content: "Jika ada pelanggan yang belanjaannya sudah mencapai target, notifikasi bonus akan menyala di sini sebagai pengingat."
  },
  {
    targetId: "tour-nav-customers",
    title: "Kelola Pelanggan",
    content: "Klik menu ini untuk melihat daftar pelanggan, mengatur diskon bertingkat (LM dan BR), atau melihat riwayat pembayaran mereka."
  },
  {
    targetId: "tour-nav-products",
    title: "Katalog Produk",
    content: "Di sini tempat menyimpan produk-produk Anda, lengkap dengan harga dasar jual dan harga modal (rahasia)."
  },
  {
    targetId: "tour-nav-bon-baru",
    title: "Buat Bon Baru",
    content: "Tombol paling penting! Setiap ada penjualan, klik di sini untuk membuat bon. Kalkulasi diskon bertingkat otomatis 100%."
  },
  {
    targetId: "tour-nav-laporan",
    title: "Laporan & PDF",
    content: "Cek rekap penjualan bulanan Anda di sini. Bisa langsung diunduh ke PDF untuk dicetak atau dikirim ke WhatsApp."
  },
  {
    targetId: "tour-onboarding-done", // Center modal
    title: "Siap Memulai!",
    content: "Panduan selesai! Jika Bapak/Ibu lupa caranya, cukup klik menu [Bantuan] untuk melihat panduan langkah demi langkah lagi.",
    actionLabel: "MULAI GUNAKAN APLIKASI"
  }
];

// Steps configuration for interactive tutorials
const TUT01_STEPS = [
  {
    targetId: "cust-add-btn",
    title: "Langkah 1/6: Tambah Pelanggan Baru",
    content: "Klik tombol [+ Pelanggan Baru] di pojok kanan atas untuk membuka formulir pengisian data pelanggan baru.",
    trigger: "click"
  },
  {
    targetId: "cust-name-input",
    title: "Langkah 2/6: Isi Nama Pelanggan",
    content: "Ketik nama pelanggan baru di sini. Silakan ketik nama latihan: 'Toko Sukses Makmur'.",
    trigger: "input"
  },
  {
    targetId: "cust-threshold-input",
    title: "Langkah 3/6: Atur Batas Target Bonus",
    content: "Masukkan nominal belanja lunas pelanggan untuk mendapatkan bonus. Ketik target: '10000000' (10 Juta rupiah).",
    trigger: "input"
  },
  {
    targetId: "cust-add-lm-step-btn",
    title: "Langkah 4/6: Tambah Tahap Diskon",
    content: "Klik tombol [+ Tambah Tahap] di bagian diskon LM untuk menambahkan diskon bertingkat tahap kedua.",
    trigger: "click"
  },
  {
    targetId: "cust-lm-discount-1",
    title: "Langkah 5/6: Masukkan Persen Diskon Kedua",
    content: "Masukkan angka persen diskon tahap kedua. Ketik angka: '5'.",
    trigger: "input"
  },
  {
    targetId: "cust-save-btn",
    title: "Langkah 6/6: Simpan Data Pelanggan",
    content: "Klik tombol [Tambah Pelanggan] untuk menyelesaikan penambahan data pelanggan baru demo ini.",
    trigger: "click"
  }
];

const TUT02_STEPS = [
  {
    targetId: "prod-add-btn",
    title: "Langkah 1/5: Tambah Produk Baru",
    content: "Klik tombol [+ Produk Baru] untuk membuka formulir input produk baru.",
    trigger: "click"
  },
  {
    targetId: "prod-name-input",
    title: "Langkah 2/5: Isi Nama Produk",
    content: "Ketik nama produk minuman Anda. Coba ketik nama latihan: 'LM Teh Sehat 500ml'.",
    trigger: "input"
  },
  {
    targetId: "prod-base-price-input",
    title: "Langkah 3/5: Isi Harga Jual",
    content: "Masukkan harga jual dasar produk kepada pelanggan. Ketik harga latihan: '12000'.",
    trigger: "input"
  },
  {
    targetId: "prod-modal-price-input",
    title: "Langkah 4/5: Isi Harga Modal (Rahasia)",
    content: "Masukkan modal beli produk dari supplier. Ini rahasia, hanya untuk hitung laba bersih. Ketik harga modal: '7000'.",
    trigger: "input"
  },
  {
    targetId: "prod-save-btn",
    title: "Langkah 5/5: Simpan Produk",
    content: "Klik tombol [Tambah Produk] untuk menyimpan data produk demo Anda.",
    trigger: "click"
  }
];

const TUT03_STEPS = [
  {
    targetId: "tx-nomor-bon",
    title: "Langkah 1/11: Isi Nomor Bon",
    content: "Ketik nomor bon yang unik di sini. Contoh: 'BON-001'. Nomor ini penting untuk melacak transaksi.",
    trigger: "input"
  },
  {
    targetId: "tx-tanggal-btn",
    title: "Langkah 2/11: Tanggal Bon",
    content: "Tanggal terisi hari ini secara default. Silakan klik tombol 'Lanjut' jika tanggal sudah benar.",
    trigger: "next"
  },
  {
    targetId: "tx-customer-select",
    title: "Langkah 3/11: Pilih Pelanggan",
    content: "Klik pilihan ini dan pilih pelanggan demo 'Toko Kelontong Bu Retno'. Sistem akan otomatis memuat data diskonnya.",
    trigger: "change"
  },
  {
    targetId: "tx-add-product-btn",
    title: "Langkah 4/11: Tambah Baris Produk",
    content: "Klik tombol [+ Tambah Produk] untuk memasukkan barang yang dibeli pelanggan.",
    trigger: "click"
  },
  {
    targetId: "tx-product-select-0",
    title: "Langkah 5/11: Pilih Produk",
    content: "Pilih produk 'LM Jeruk Segar 500ml' dari daftar katalog.",
    trigger: "change"
  },
  {
    targetId: "tx-qty-input-0",
    title: "Langkah 6/11: Isi Jumlah Barang",
    content: "Ketik jumlah barang yang terjual. Coba masukkan angka '10'.",
    trigger: "input"
  },
  {
    targetId: "tx-price-calc-0",
    title: "Langkah 7/11: Harga Diskon Otomatis",
    content: "Lihat! Harga jual normal Rp15.000 otomatis dipotong diskon bertingkat (20% lalu 10%) menjadi Rp10.800. Klik Lanjut.",
    trigger: "next"
  },
  {
    targetId: "tx-ongkir-input",
    title: "Langkah 8/11: Isi Ongkir",
    content: "Masukkan ongkos kirim jika ada, atau isi 0 jika tidak ada. Ongkir ini tidak mempengaruhi laba HL. Klik Lanjut.",
    trigger: "next"
  },
  {
    targetId: "tx-summary-cards",
    title: "Langkah 9/11: Ringkasan Total",
    content: "Di sini Bapak/Ibu bisa melihat total omzet, biaya ongkir, dan total tagihan yang harus dibayar. Klik Lanjut.",
    trigger: "next"
  },
  {
    targetId: "tx-status-select",
    title: "Langkah 10/11: Status Pembayaran",
    content: "Status bawaan adalah 'Piutang' karena biasanya pelanggan belum langsung bayar. Biarkan 'Piutang' lalu klik Lanjut.",
    trigger: "next"
  },
  {
    targetId: "tx-save-btn",
    title: "Langkah 11/11: Simpan Bon",
    content: "Klik tombol [SIMPAN BON] untuk menyelesaikan transaksi latihan ini. Data demo ini tidak akan merusak pembukuan asli Anda.",
    trigger: "click"
  }
];

const TUT04_STEPS = [
  {
    targetId: "cust-detail-btn-cust-seed-1",
    title: "Langkah 1/4: Buka Detail Transaksi",
    content: "Cari pelanggan 'Toko Kelontong Bu Retno', lalu klik tombol [Transaksi ➔] untuk melihat riwayat pembukuannya.",
    trigger: "click"
  },
  {
    targetId: "cust-detail-month-select",
    title: "Langkah 2/4: Pilih Bulan Laporan",
    content: "Klik dropdown filter bulan untuk memfilter transaksi bulanan yang ingin Anda lihat. Klik Lanjut jika sudah.",
    trigger: "next"
  },
  {
    targetId: "cust-detail-piutang-card",
    title: "Langkah 3/4: Lihat Piutang Outstanding",
    content: "Kartu merah ini menunjukkan total piutang (belum bayar) pelanggan pada bulan terpilih. Klik Lanjut.",
    trigger: "next"
  },
  {
    targetId: "cust-detail-print-piutang-btn",
    title: "Langkah 4/4: Cetak Surat Piutang (PDF)",
    content: "Klik tombol [Cetak Surat Piutang (PDF)] untuk menghasilkan berkas tagihan piutang siap cetak.",
    trigger: "click"
  }
];

const TUT05_STEPS = [
  {
    targetId: "cust-detail-btn-cust-seed-1",
    title: "Langkah 1/5: Buka Transaksi Pelanggan",
    content: "Klik tombol [Transaksi ➔] pada 'Toko Kelontong Bu Retno' untuk melunasi salah satu bonnya.",
    trigger: "click"
  },
  {
    targetId: "cust-detail-settle-btn-tx-seed-2",
    title: "Langkah 2/5: Pilih Bon untuk Dilunaskan",
    content: "Cari nota bon 'BON-2026-002' berstatus Piutang, lalu klik tombol [Setor Lunas] di kolom sebelah kanan.",
    trigger: "click"
  },
  {
    targetId: "settle-date-input",
    title: "Langkah 3/5: Isi Tanggal Pelunasan",
    content: "Masukkan tanggal ketika uang pembayaran dari pelanggan diterima. Klik Lanjut jika sudah diisi.",
    trigger: "next"
  },
  {
    targetId: "settle-confirm-btn",
    title: "Langkah 4/5: Konfirmasi Pelunasan",
    content: "Klik tombol hijau [Konfirmasi Lunas] untuk memproses status bon menjadi Lunas.",
    trigger: "click"
  }
];

const TUT06_STEPS = [
  {
    targetId: "cust-detail-btn-cust-seed-1",
    title: "Langkah 1/4: Buka Transaksi Pelanggan",
    content: "Mari melunasi semua bon dalam sebulan penuh sekaligus. Klik [Transaksi ➔] pada 'Toko Kelontong Bu Retno'.",
    trigger: "click"
  },
  {
    targetId: "cust-detail-settle-month-btn",
    title: "Langkah 2/4: Pelunasan Satu Bulan",
    content: "Klik tombol biru [Setor Pelunasan Bulan Ini] untuk melunasi semua bon berstatus Piutang di bulan ini sekaligus.",
    trigger: "click"
  },
  {
    targetId: "settle-date-input",
    title: "Langkah 3/4: Isi Tanggal Bayar",
    content: "Tentukan tanggal diterimanya seluruh pembayaran tersebut, lalu klik Lanjut.",
    trigger: "next"
  },
  {
    targetId: "settle-confirm-btn",
    title: "Langkah 4/4: Simpan Pelunasan Bulanan",
    content: "Klik tombol [Konfirmasi Lunas] untuk menyelesaikan pelunasan massal demo ini.",
    trigger: "click"
  }
];

const TUT07_STEPS = [
  {
    targetId: "cust-edit-btn-cust-seed-1",
    title: "Langkah 1/3: Ubah Data Pelanggan",
    content: "Cari 'Toko Kelontong Bu Retno', lalu klik tombol ikon pensil biru [Ubah Data] untuk membuka formulir diskon.",
    trigger: "click"
  },
  {
    targetId: "cust-lm-discount-0",
    title: "Langkah 2/3: Sesuaikan Persen Diskon",
    content: "Ubah persentase diskon tahap pertama pada bagian Diskon LM. Klik Lanjut jika sudah disesuaikan.",
    trigger: "next"
  },
  {
    targetId: "cust-save-btn",
    title: "Langkah 3/3: Simpan Diskon Baru",
    content: "Klik tombol [Simpan Perubahan] untuk menyimpan potongan diskon baru yang berlaku otomatis.",
    trigger: "click"
  }
];

const TUT08_STEPS = [
  {
    targetId: "report-month-select",
    title: "Langkah 1/3: Pilih Periode Rekap",
    content: "Pilih bulan dan tahun laporan keuangan yang ingin Anda cetak pada filter dropdown, lalu klik Lanjut.",
    trigger: "next"
  },
  {
    targetId: "report-stats-cards",
    title: "Langkah 2/3: Tinjau Finansial Bisnis",
    content: "Tinjau total Omzet Lunas, Laba Bersih, Outstanding Piutang, dan Setoran Masuk. Klik Lanjut.",
    trigger: "next"
  },
  {
    targetId: "report-pdf-btn",
    title: "Langkah 3/3: Cetak PDF Rekap Keseluruhan",
    content: "Klik tombol [Unduh PDF Rekap Keseluruhan] untuk mencetak atau menyimpan dokumen laporan bulanan.",
    trigger: "click"
  }
];

const TUT09_STEPS = [
  {
    targetId: "tx-customer-select",
    title: "Langkah 1/6: Pilih Pelanggan",
    content: "Pilih nama pelanggan demo 'Toko Kelontong Bu Retno' yang sudah berhak menerima bonus belanja.",
    trigger: "change"
  },
  {
    targetId: "tx-bonus-toggle",
    title: "Langkah 2/6: Aktifkan Mode Nota Bonus",
    content: "Klik tombol sakelar (toggle) 'Nota Pengambilan Bonus' untuk mengaktifkan bon gratis.",
    trigger: "change"
  },
  {
    targetId: "tx-add-product-btn",
    title: "Langkah 3/6: Tambah Baris Produk",
    content: "Klik [+ Tambah Produk] untuk memasukkan produk bonus gratis yang diambil.",
    trigger: "click"
  },
  {
    targetId: "tx-product-select-0",
    title: "Langkah 4/6: Pilih Produk Bonus",
    content: "Pilih produk 'LM Jeruk Segar 500ml' sebagai barang bonus gratis.",
    trigger: "change"
  },
  {
    targetId: "tx-qty-input-0",
    title: "Langkah 5/6: Tentukan Qty Bonus",
    content: "Masukkan jumlah unit bonus yang diambil. Coba ketik angka '2' (harga otomatis menjadi GRATIS).",
    trigger: "input"
  },
  {
    targetId: "tx-save-btn",
    title: "Langkah 6/6: Simpan Nota Bonus",
    content: "Klik tombol [SIMPAN BON] untuk menyimpan bon bonus. Nilai tagihan dan laba bon bonus tidak dihitung dalam laba utama.",
    trigger: "click"
  }
];

const TUT10_STEPS = [
  {
    targetId: "tour-dashboard-stats",
    title: "Langkah 1/4: Memahami Keuangan Anda",
    content: "Aplikasi membagi rekap bisnis Anda menjadi 3 kartu ringkasan di dashboard. Mari kita pelajari. Klik Lanjut.",
    trigger: "next"
  },
  {
    targetId: "tour-dashboard-stats", // Spotlight the stats area
    title: "Langkah 2/4: Pahami 'Total Piutang'",
    content: "Total Piutang adalah uang Anda di luar. Ini adalah nota belanjaan barang yang belum dibayar pelanggan. Klik Lanjut.",
    trigger: "next"
  },
  {
    targetId: "tour-dashboard-stats",
    title: "Langkah 3/4: Pahami 'Penjualan Lunas'",
    content: "Penjualan Lunas adalah omzet kotor dari nota yang sudah dibayar lunas. Pembukuan ini berbasis kas (Cash Basis). Klik Lanjut.",
    trigger: "next"
  },
  {
    targetId: "tour-dashboard-stats",
    title: "Langkah 4/4: Pahami 'Keuntungan Bersih'",
    content: "Laba Bersih adalah keuntungan riil Anda (Harga Jual setelah diskon dikurangi Harga Modal beli produk). Klik Selesai.",
    trigger: "next"
  }
];

const TUT11_STEPS = [
  {
    targetId: "cust-detail-btn-cust-seed-1",
    title: "Langkah 1/5: Buka Detail Transaksi",
    content: "Jika salah mencatat transaksi, Anda dapat memperbaikinya. Buka [Transaksi ➔] pada 'Toko Kelontong Bu Retno'.",
    trigger: "click"
  },
  {
    targetId: "cust-detail-edit-btn-tx-seed-2",
    title: "Langkah 2/5: Klik Ubah Nota Bon",
    content: "Cari bon nomor 'BON-2026-002' berstatus Piutang, lalu klik tombol [Ubah] di sebelah kanan.",
    trigger: "click"
  },
  {
    targetId: "tx-qty-input-0",
    title: "Langkah 3/5: Perbaiki Jumlah Qty",
    content: "Ubah jumlah quantity barang menjadi angka '12'. Sistem akan menghitung ulang diskon bertingkat secara otomatis. Klik Lanjut.",
    trigger: "input"
  },
  {
    targetId: "tx-save-btn",
    title: "Langkah 4/5: Simpan Hasil Koreksi",
    content: "Klik tombol [SIMPAN BON] untuk memperbarui data bon. Nilai rekap laporan keuangan langsung ikut terupdate.",
    trigger: "click"
  }
];

const TUT12_STEPS = [
  {
    targetId: "cust-detail-btn-cust-seed-1",
    title: "Langkah 1/9: Buka Detail Transaksi",
    content: "Cari pelanggan Toko Kelontong Bu Retno, lalu klik tombol [Transaksi] untuk melihat riwayat piutangnya.",
    trigger: "click"
  },
  {
    targetId: "cust-detail-edit-btn-tx-seed-2",
    title: "Langkah 2/9: Ubah Nota Bon",
    content: "Cari bon nomor BON-2026-002 berstatus Piutang (30 unit), lalu klik [Ubah] untuk membagi transaksi.",
    trigger: "click"
  },
  {
    targetId: "tx-qty-input-0",
    title: "Langkah 3/9: Kurangi Jumlah Barang",
    content: "Pelanggan membayar cicilan untuk 15 unit terlebih dahulu. Ubah jumlah quantity dari 30 menjadi 15.",
    trigger: "input"
  },
  {
    targetId: "tx-status-select",
    title: "Langkah 4/9: Atur Status Lunas",
    content: "Ubah status pembayaran menjadi Lunas untuk mencatat bahwa pembayaran 15 unit pertama ini sudah diterima.",
    trigger: "change"
  },
  {
    targetId: "tx-save-btn",
    title: "Langkah 5/9: Simpan Cicilan Pertama",
    content: "Klik tombol [SIMPAN BON] untuk memperbarui data cicilan pertama yang lunas.",
    trigger: "click"
  },
  {
    targetId: "tour-nav-customers",
    title: "Langkah 6/9: Kembali ke Pelanggan",
    content: "Setelah cicilan pertama lunas disimpan, klik menu [Pelanggan] untuk memproses sisa cicilan.",
    trigger: "click"
  },
  {
    targetId: "cust-detail-btn-cust-seed-1",
    title: "Langkah 7/9: Buka Kembali Transaksi",
    content: "Klik kembali tombol [Transaksi] pada Toko Kelontong Bu Retno.",
    trigger: "click"
  },
  {
    targetId: "cust-detail-settle-btn-tx-seed-4",
    title: "Langkah 8/9: Setor Lunas Sisa Cicilan",
    content: "Kini pelanggan ingin melunasi sisa cicilan (BON-2026-002-SIS). Klik tombol [Setor Lunas] pada bon sisa tersebut.",
    trigger: "click"
  },
  {
    targetId: "settle-confirm-btn",
    title: "Langkah 9/9: Konfirmasi Pelunasan Sisa",
    content: "Klik tombol [Konfirmasi Lunas] untuk menyelesaikan seluruh rangkaian pembayaran cicilan pelanggan ini.",
    trigger: "click"
  }
];

export const TutorialProvider = ({ children }) => {
  const pathname = usePathname();
  const router = useRouter();
  const [onboardingActive, setOnboardingActive] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [activeTutorial, setActiveTutorial] = useState(null); // { id: string, currentStep: number, steps: array }
  const [demoData, setDemoData] = useState(null); // Used to isolate tutorial changes


  useEffect(() => {
    if (pathname === '/login' || !api.getCurrentSession()) {
      return;
    }
    let active = true;
    const loadProgress = async () => {
      try {
        const progress = await api.getTutorialProgress();
        if (!active) return;
        if (progress && !progress.onboarding_completed) {
          // Delay onboarding modal slightly for better UX
          const timer = setTimeout(() => {
            setOnboardingActive(true);
            setOnboardingStep(progress.onboarding_last_step || 0);
          }, 1000);
          return () => clearTimeout(timer);
        }
      } catch (err) {
        console.error("Failed to fetch onboarding progress:", err);
      }
    };
    loadProgress();
    return () => {
      active = false;
    };
  }, [pathname]);

  // Onboarding controls
  const nextOnboarding = () => {
    if (onboardingStep < ONBOARDING_STEPS.length - 1) {
      const nextStep = onboardingStep + 1;
      setOnboardingStep(nextStep);
      api.updateTutorialProgress({ onboarding_last_step: nextStep });
      if (nextStep === 1 || nextStep === 2) {
        router.push('/dashboard');
      }
    } else {
      setOnboardingActive(false);
      api.updateTutorialProgress({ onboarding_completed: true });
    }
  };

  const prevOnboarding = () => {
    if (onboardingStep > 0) {
      const prevStep = onboardingStep - 1;
      setOnboardingStep(prevStep);
      api.updateTutorialProgress({ onboarding_last_step: prevStep });
    }
  };

  const skipOnboarding = () => {
    setOnboardingActive(false);
    api.updateTutorialProgress({ onboarding_completed: true });
  };

  const restartOnboarding = () => {
    api.resetOnboarding();
    setOnboardingStep(0);
    setOnboardingActive(true);
    router.push('/dashboard');
  };

  // Guided Tutorial Mode controls
  const startTutorial = (tutorialId) => {
    let steps = [];
    let initialDemoData = null;

    switch (tutorialId) {
      case "TUT-01":
        steps = TUT01_STEPS;
        break;
      case "TUT-02":
        steps = TUT02_STEPS;
        break;
      case "TUT-03":
        steps = TUT03_STEPS;
        initialDemoData = {
          nomor_bon: "BON-TUT-DEMO",
          tanggal: new Date().toISOString().split('T')[0],
          customer_id: "",
          ongkir: 0,
          deskripsi: "Bon Latihan Tutorial",
          is_bonus: false,
          status: "Piutang",
          items: []
        };
        break;
      case "TUT-04":
        steps = TUT04_STEPS;
        break;
      case "TUT-05":
        steps = TUT05_STEPS;
        break;
      case "TUT-06":
        steps = TUT06_STEPS;
        break;
      case "TUT-07":
        steps = TUT07_STEPS;
        break;
      case "TUT-08":
        steps = TUT08_STEPS;
        break;
      case "TUT-09":
        steps = TUT09_STEPS;
        initialDemoData = {
          nomor_bon: "BON-BONUS-DEMO",
          tanggal: new Date().toISOString().split('T')[0],
          customer_id: "",
          ongkir: 0,
          deskripsi: "Pengambilan Bonus Hadiah",
          is_bonus: true,
          status: "Lunas",
          items: []
        };
        break;
      case "TUT-10":
        steps = TUT10_STEPS;
        break;
      case "TUT-11":
        steps = TUT11_STEPS;
        break;
      case "TUT-12":
        steps = TUT12_STEPS;
        break;
      default:
        steps = [];
    }

    if (steps.length > 0) {
      localStorage.setItem("hl_tutorial_active", "true");

      // ── SANDBOX DATA ──────────────────────────────────────────────────────
      // Pre-seed mock products, customers and transactions so all tutorial steps
      // work even when the real database is empty.
      const DEMO_PRODUCTS = [
        { id: 'prod-seed-1', nama: 'LM Jeruk Segar 500ml', harga_modal: 8000, harga_base: 15000, tipe: 'LM', is_deleted: false },
        { id: 'prod-seed-2', nama: 'LM Apel Manis 500ml',  harga_modal: 9000, harga_base: 16000, tipe: 'LM', is_deleted: false },
        { id: 'prod-seed-3', nama: 'BR Cokelat Creamy 250ml', harga_modal: 5000, harga_base: 10000, tipe: 'BR', is_deleted: false },
        { id: 'prod-seed-4', nama: 'BR Strawberry Milkshake 250ml', harga_modal: 5500, harga_base: 11000, tipe: 'BR', is_deleted: false },
        { id: 'prod-seed-5', nama: 'BR Melon Float 250ml', harga_modal: 6000, harga_base: 12000, tipe: 'BR', is_deleted: false },
      ];

      const DEMO_CUSTOMERS = [
        {
          id: 'cust-seed-1',
          nama: 'Toko Kelontong Bu Retno',
          bonus_threshold: 10000000,
          is_deleted: false,
          discounts: { LM: [20, 10], BR: [15, 5] },
          discounts_lm: [20, 10],
          discounts_br: [15, 5],
        },
        {
          id: 'cust-seed-2',
          nama: 'Warung Kopi Pak Mamat',
          bonus_threshold: 5000000,
          is_deleted: false,
          discounts: { LM: [10], BR: [10] },
          discounts_lm: [10],
          discounts_br: [10],
        },
        {
          id: 'cust-seed-3',
          nama: 'Depot Barokah',
          bonus_threshold: 15000000,
          is_deleted: false,
          discounts: { LM: [25, 20, 10], BR: [20, 10] },
          discounts_lm: [25, 20, 10],
          discounts_br: [20, 10],
        },
      ];

      const DEMO_TRANSACTIONS = [
        {
          id: 'tx-seed-1',
          nomor_bon: 'BON-2026-001',
          tanggal: '2026-06-01',
          customer_id: 'cust-seed-1',
          ongkir: 15000,
          deskripsi: 'Pengiriman sore hari',
          is_bonus: false,
          status: 'Lunas',
          tanggal_lunas: '2026-06-02',
          omzet_total: 1347500,
          laba_total: 447500,
          amount_owed: 1362500,
          items: [
            { id: 'item-s1-1', transaction_id: 'tx-seed-1', product_id: 'prod-seed-1', quantity: 50, product_type_snapshot: 'LM', harga_base_snapshot: 15000, harga_modal_snapshot: 8000, discounted_unit_price: 10800, line_omzet: 540000, line_laba: 140000, is_bonus_item: false, product: { id: 'prod-seed-1', nama: 'LM Jeruk Segar 500ml', tipe: 'LM', harga_base: 15000 } },
            { id: 'item-s1-2', transaction_id: 'tx-seed-1', product_id: 'prod-seed-3', quantity: 100, product_type_snapshot: 'BR', harga_base_snapshot: 10000, harga_modal_snapshot: 5000, discounted_unit_price: 8075, line_omzet: 807500, line_laba: 307500, is_bonus_item: false, product: { id: 'prod-seed-3', nama: 'BR Cokelat Creamy 250ml', tipe: 'BR', harga_base: 10000 } },
          ],
          customer: { id: 'cust-seed-1', nama: 'Toko Kelontong Bu Retno' },
        },
        {
          id: 'tx-seed-2',
          nomor_bon: 'BON-2026-002',
          tanggal: '2026-06-10',
          customer_id: 'cust-seed-1',
          ongkir: 20000,
          deskripsi: 'Titip di satpam',
          is_bonus: false,
          status: 'Piutang',
          tanggal_lunas: null,
          omzet_total: 345600,
          laba_total: 75600,
          amount_owed: 365600,
          items: [
            { id: 'item-s2-1', transaction_id: 'tx-seed-2', product_id: 'prod-seed-2', quantity: 30, product_type_snapshot: 'LM', harga_base_snapshot: 16000, harga_modal_snapshot: 9000, discounted_unit_price: 11520, line_omzet: 345600, line_laba: 75600, is_bonus_item: false, product: { id: 'prod-seed-2', nama: 'LM Apel Manis 500ml', tipe: 'LM', harga_base: 16000 } },
          ],
          customer: { id: 'cust-seed-1', nama: 'Toko Kelontong Bu Retno' },
        },
        {
          id: 'tx-seed-3',
          nomor_bon: 'BON-2026-003',
          tanggal: '2026-06-12',
          customer_id: 'cust-seed-2',
          ongkir: 10000,
          deskripsi: 'Demo transaksi besar lunas',
          is_bonus: false,
          status: 'Lunas',
          tanggal_lunas: '2026-06-15',
          omzet_total: 5760000,
          laba_total: 2160000,
          amount_owed: 5770000,
          items: [
            { id: 'item-s3-1', transaction_id: 'tx-seed-3', product_id: 'prod-seed-2', quantity: 400, product_type_snapshot: 'LM', harga_base_snapshot: 16000, harga_modal_snapshot: 9000, discounted_unit_price: 14400, line_omzet: 5760000, line_laba: 2160000, is_bonus_item: false, product: { id: 'prod-seed-2', nama: 'LM Apel Manis 500ml', tipe: 'LM', harga_base: 16000 } },
          ],
          customer: { id: 'cust-seed-2', nama: 'Warung Kopi Pak Mamat' },
        },
      ];

      const demoTransactions = [...DEMO_TRANSACTIONS];
      if (tutorialId === "TUT-12") {
        demoTransactions.push({
          id: 'tx-seed-4',
          nomor_bon: 'BON-2026-002-SIS',
          tanggal: '2026-06-10',
          customer_id: 'cust-seed-1',
          ongkir: 0,
          deskripsi: 'Sisa cicilan bon BON-2026-002',
          is_bonus: false,
          status: 'Piutang',
          tanggal_lunas: null,
          omzet_total: 172800,
          laba_total: 37800,
          amount_owed: 172800,
          items: [
            { id: 'item-s4-1', transaction_id: 'tx-seed-4', product_id: 'prod-seed-2', quantity: 15, product_type_snapshot: 'LM', harga_base_snapshot: 16000, harga_modal_snapshot: 9000, discounted_unit_price: 11520, line_omzet: 172800, line_laba: 37800, is_bonus_item: false, product: { id: 'prod-seed-2', nama: 'LM Apel Manis 500ml', tipe: 'LM', harga_base: 16000 } },
          ],
          customer: { id: 'cust-seed-1', nama: 'Toko Kelontong Bu Retno' },
        });
      }
      localStorage.setItem("hl_demo_products", JSON.stringify(DEMO_PRODUCTS));
      localStorage.setItem("hl_demo_customers", JSON.stringify(DEMO_CUSTOMERS));
      localStorage.setItem("hl_demo_transactions", JSON.stringify(demoTransactions));
      // ─────────────────────────────────────────────────────────────────────

      setActiveTutorial({
        id: tutorialId,
        currentStep: 0,
        steps: steps
      });
      if (initialDemoData) {
        setDemoData(initialDemoData);
      } else {
        setDemoData(null);
      }
    } else {
      alert(`Tutorial ${tutorialId} dimulai dalam mode penjelasan singkat.`);
      api.completeTutorial(tutorialId);
    }
  };

  const exitTutorial = () => {
    localStorage.removeItem("hl_tutorial_active");
    localStorage.removeItem("hl_demo_products");
    localStorage.removeItem("hl_demo_customers");
    localStorage.removeItem("hl_demo_transactions");
    setActiveTutorial(null);
    setDemoData(null);
  };

  const nextTutorialStep = () => {
    if (!activeTutorial) return;
    if (activeTutorial.currentStep < activeTutorial.steps.length - 1) {
      const nextStep = activeTutorial.currentStep + 1;
      setActiveTutorial({
        ...activeTutorial,
        currentStep: nextStep
      });
    } else {
      // Completed!
      localStorage.removeItem("hl_tutorial_active");
      localStorage.removeItem("hl_demo_products");
      localStorage.removeItem("hl_demo_customers");
      localStorage.removeItem("hl_demo_transactions");
      api.completeTutorial(activeTutorial.id);
      const tid = activeTutorial.id;
      setActiveTutorial(null);
      setDemoData(null);
      
      // Trigger completion modal or event
      const event = new CustomEvent('tutorial-completed', { detail: { id: tid } });
      window.dispatchEvent(event);
    }
  };

  const registerTrigger = (elementId, type) => {
    if (!activeTutorial) return;
    const currentStepConfig = activeTutorial.steps[activeTutorial.currentStep];
    if (currentStepConfig.targetId === elementId && currentStepConfig.trigger === type) {
      nextTutorialStep();
    }
  };

  // Sync highlight ID with active steps using useMemo
  const highlightId = useMemo(() => {
    if (onboardingActive) {
      return ONBOARDING_STEPS[onboardingStep]?.targetId || null;
    } else if (activeTutorial) {
      return activeTutorial.steps[activeTutorial.currentStep]?.targetId || null;
    }
    return null;
  }, [onboardingActive, onboardingStep, activeTutorial]);

  return (
    <TutorialContext.Provider value={{
      onboardingActive,
      onboardingStep,
      activeTutorial,
      demoData,
      setDemoData,
      highlightId,
      nextOnboarding,
      prevOnboarding,
      skipOnboarding,
      restartOnboarding,
      startTutorial,
      exitTutorial,
      nextTutorialStep,
      registerTrigger
    }}>
      {children}
      <OverlayLayer />
    </TutorialContext.Provider>
  );
};

// Spotlight backdrop layer using viewport-relative four-backdrop divs (blocks outer clicks, allows spotlight clicks)
const OverlayLayer = () => {
  const { onboardingActive, onboardingStep, activeTutorial, highlightId, nextOnboarding, prevOnboarding, skipOnboarding, nextTutorialStep, exitTutorial } = useTutorial();
  const [dimensions, setDimensions] = useState({ top: 0, left: 0, width: 0, height: 0 });
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);

  const getVisibleElement = (id) => {
    if (typeof document === 'undefined') return null;
    const elements = document.querySelectorAll(`[id="${id}"]`);
    for (let i = 0; i < elements.length; i++) {
      const el = elements[i];
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        return el;
      }
    }
    return document.getElementById(id);
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = windowWidth < 768;

  // Auto-scroll target element into view
  useEffect(() => {
    if (!highlightId) return;
    const timer = setTimeout(() => {
      const el = getVisibleElement(highlightId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [highlightId]);

  useEffect(() => {
    if (!highlightId) return;

    const updatePosition = () => {
      const el = getVisibleElement(highlightId);
      if (el) {
        const rect = el.getBoundingClientRect();
        setDimensions({
          top: rect.top, // Viewport-relative
          left: rect.left, // Viewport-relative
          width: rect.width,
          height: rect.height
        });
      }
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition);
    
    const interval = setInterval(updatePosition, 150);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition);
      clearInterval(interval);
    };
  }, [highlightId, onboardingStep, activeTutorial]);

  if (!onboardingActive && !activeTutorial) return null;

  // Onboarding Step content
  const isOboardingStep = onboardingActive;
  const currentStepData = isOboardingStep 
    ? ONBOARDING_STEPS[onboardingStep] 
    : activeTutorial.steps[activeTutorial.currentStep];

  const hasTarget = highlightId && dimensions.width > 0;
  
  // Calculate tooltip placement
  const tooltipStyle = {};
  if (isMobile) {
    // Mobile Bottom Sheet / Top Sheet
    tooltipStyle.position = 'fixed';
    tooltipStyle.left = '16px';
    tooltipStyle.right = '16px';
    tooltipStyle.transform = 'none';
    tooltipStyle.width = 'auto';
    tooltipStyle.maxWidth = 'calc(100vw - 32px)';
    tooltipStyle.margin = '0 auto';
    tooltipStyle.zIndex = 9100;

    const isTargetInBottomHalf = hasTarget && (dimensions.top + dimensions.height / 2 > window.innerHeight / 2);
    if (isTargetInBottomHalf) {
      tooltipStyle.top = '16px';
      tooltipStyle.bottom = 'auto';
    } else {
      tooltipStyle.top = 'auto';
      tooltipStyle.bottom = '16px';
    }
  } else if (hasTarget) {
    // Desktop smart viewport positioning
    const tooltipWidth = 320;
    const tooltipHeight = 240; // Estimated height of the tooltip card
    const margin = 12;

    const spaceAbove = dimensions.top;
    const spaceBelow = window.innerHeight - (dimensions.top + dimensions.height);
    const spaceLeft = dimensions.left;
    const spaceRight = window.innerWidth - (dimensions.left + dimensions.width);

    // Decide placement: 'bottom', 'top', 'left', or 'right'
    let placement = 'bottom';

    if (spaceBelow >= tooltipHeight + margin) {
      placement = 'bottom';
    } else if (spaceAbove >= tooltipHeight + margin) {
      placement = 'top';
    } else if (spaceLeft >= tooltipWidth + margin) {
      placement = 'left';
    } else if (spaceRight >= tooltipWidth + margin) {
      placement = 'right';
    } else {
      // Fallback: place it where there is more vertical space
      placement = spaceBelow > spaceAbove ? 'bottom' : 'top';
    }

    tooltipStyle.position = 'fixed';
    tooltipStyle.zIndex = 9100;

    if (placement === 'bottom') {
      tooltipStyle.top = `${dimensions.top + dimensions.height + margin}px`;
      tooltipStyle.left = `${Math.max(16, Math.min(windowWidth - tooltipWidth - 16, dimensions.left + (dimensions.width / 2) - (tooltipWidth / 2)))}px`;
    } else if (placement === 'top') {
      tooltipStyle.bottom = `${window.innerHeight - dimensions.top + margin}px`;
      tooltipStyle.left = `${Math.max(16, Math.min(windowWidth - tooltipWidth - 16, dimensions.left + (dimensions.width / 2) - (tooltipWidth / 2)))}px`;
    } else if (placement === 'left') {
      tooltipStyle.left = `${dimensions.left - tooltipWidth - margin}px`;
      tooltipStyle.top = `${Math.max(16, Math.min(window.innerHeight - tooltipHeight - 16, dimensions.top))}px`;
    } else if (placement === 'right') {
      tooltipStyle.left = `${dimensions.left + dimensions.width + margin}px`;
      tooltipStyle.top = `${Math.max(16, Math.min(window.innerHeight - tooltipHeight - 16, dimensions.top))}px`;
    }
  } else {
    // Center modal
    tooltipStyle.position = 'fixed';
    tooltipStyle.top = '50%';
    tooltipStyle.left = '50%';
    tooltipStyle.transform = 'translate(-50%, -50%)';
    tooltipStyle.zIndex = 9100;
  }

  return (
    <div className="fixed inset-0 z-[9000] pointer-events-none select-none">
      {/* Non-overlapping Backdrop block layer */}
      {!hasTarget ? (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(1.5px)',
            pointerEvents: 'auto',
            zIndex: 9000
          }}
        />
      ) : (
        <>
          {/* Top backdrop */}
          <div 
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              height: `${Math.max(0, dimensions.top - 4)}px`,
              backgroundColor: 'rgba(15, 23, 42, 0.65)',
              backdropFilter: 'blur(1.5px)',
              WebkitBackdropFilter: 'blur(1.5px)',
              pointerEvents: 'auto',
              zIndex: 9000
            }}
          />
          {/* Bottom backdrop */}
          <div 
            style={{
              position: 'fixed',
              top: `${dimensions.top + dimensions.height + 4}px`,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(15, 23, 42, 0.65)',
              backdropFilter: 'blur(1.5px)',
              WebkitBackdropFilter: 'blur(1.5px)',
              pointerEvents: 'auto',
              zIndex: 9000
            }}
          />
          {/* Left backdrop */}
          <div 
            style={{
              position: 'fixed',
              top: `${Math.max(0, dimensions.top - 4)}px`,
              height: `${dimensions.height + 8}px`,
              left: 0,
              width: `${Math.max(0, dimensions.left - 4)}px`,
              backgroundColor: 'rgba(15, 23, 42, 0.65)',
              backdropFilter: 'blur(1.5px)',
              WebkitBackdropFilter: 'blur(1.5px)',
              pointerEvents: 'auto',
              zIndex: 9000
            }}
          />
          {/* Right backdrop */}
          <div 
            style={{
              position: 'fixed',
              top: `${Math.max(0, dimensions.top - 4)}px`,
              height: `${dimensions.height + 8}px`,
              left: `${dimensions.left + dimensions.width + 4}px`,
              right: 0,
              backgroundColor: 'rgba(15, 23, 42, 0.65)',
              backdropFilter: 'blur(1.5px)',
              WebkitBackdropFilter: 'blur(1.5px)',
              pointerEvents: 'auto',
              zIndex: 9000
            }}
          />
        </>
      )}

      {/* Spotlight highlight outline wrapper (for pulse visual effect) */}
      {hasTarget && (
        <div 
          className="fixed border-2 border-amber-gold rounded-[12px] animate-spotlight-glow pointer-events-none"
          style={{
            top: `${dimensions.top - 5}px`,
            left: `${dimensions.left - 5}px`,
            width: `${dimensions.width + 10}px`,
            height: `${dimensions.height + 10}px`,
            zIndex: 9050
          }}
        />
      )}

      {/* Tooltip Card Bubble */}
      <div 
        className={`fixed pointer-events-auto bg-white rounded-2xl shadow-2xl p-5 border border-amber-soft select-text ${isMobile ? 'w-auto' : 'w-[320px]'}`}
        style={tooltipStyle}
      >
        <div className="flex justify-between items-center mb-3">
          <span className="text-[10px] font-bold text-gray-500 tracking-wider uppercase">
            {isOboardingStep 
              ? `Langkah ${onboardingStep + 1} dari ${ONBOARDING_STEPS.length}`
              : `Mode Tutorial • Langkah ${activeTutorial.currentStep + 1} dari ${activeTutorial.steps.length}`}
          </span>
          <button 
            onClick={isOboardingStep ? skipOnboarding : exitTutorial}
            className="p-1 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
            title="Keluar"
          >
            <X size={16} />
          </button>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden mb-4">
          <div 
            className="bg-gradient-to-r from-amber-gold to-amber-deep h-full transition-all duration-300" 
            style={{ 
              width: `${isOboardingStep 
                ? ((onboardingStep + 1) / ONBOARDING_STEPS.length) * 100 
                : ((activeTutorial.currentStep + 1) / activeTutorial.steps.length) * 100}%` 
            }}
          />
        </div>

        <h3 className="text-body-lg font-bold text-charcoal-black mb-2 flex items-center gap-2">
          {currentStepData.title}
        </h3>
        <p className="text-small text-charcoal-medium leading-relaxed mb-4">
          {currentStepData.content}
        </p>

        {/* Action button instructions in Tutorial Mode */}
        {!isOboardingStep && currentStepData.trigger && currentStepData.trigger !== "next" && (
          <div className="mb-4 p-2 bg-amber-cream border border-amber-soft rounded-lg text-xs font-semibold text-amber-deep flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-amber-gold animate-ping" />
            Lakukan aksi: Klik/Ketik pada area spotlight
          </div>
        )}

        <div className="flex justify-between items-center">
          {/* Back Button */}
          {isOboardingStep && onboardingStep > 0 ? (
            <button 
              onClick={prevOnboarding}
              className="flex items-center text-xs font-semibold text-gray-500 hover:text-gray-700 transition-colors py-2 px-3 cursor-pointer"
            >
              <ChevronLeft size={16} className="mr-1" /> Kembali
            </button>
          ) : (
            <div />
          )}

          {/* Next Button */}
          {isOboardingStep ? (
            <button 
              onClick={nextOnboarding}
              className="bg-cta hover:bg-cta/90 text-primary text-xs font-bold px-4 py-2 rounded-xl shadow-md transition-all flex items-center cursor-pointer font-mono"
            >
              {currentStepData.actionLabel || "Lanjut"} <ChevronRight size={16} className="ml-1" />
            </button>
          ) : (
            // In tutorial mode, show Next button only if target trigger is a manual 'next' click
            (currentStepData.trigger === "next" || !currentStepData.trigger) ? (
              <button 
                onClick={nextTutorialStep}
                className="bg-cta hover:bg-cta/90 text-primary text-xs font-bold px-4 py-2 rounded-xl shadow-md transition-all flex items-center ml-auto cursor-pointer font-mono"
              >
                Lanjut <ChevronRight size={16} className="ml-1" />
              </button>
            ) : null
          )}
        </div>
      </div>
    </div>
  );
};

// Help popover bubble context trigger [?]
export const ContextualTooltip = ({ id, content, className = "" }) => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const handleOutsideClick = () => setOpen(false);
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, [open]);

  const toggleOpen = (e) => {
    e.stopPropagation();
    setOpen(!open);
  };

  return (
    <div className={`relative inline-block ${className}`}>
      <button
        type="button"
        id={id}
        onClick={toggleOpen}
        className="w-5 h-5 rounded-full bg-gray-200 hover:bg-navy-ice text-gray-500 hover:text-navy-deep text-xs font-bold inline-flex items-center justify-center transition-colors cursor-pointer"
        title="Tanya Panduan"
      >
        <HelpCircle size={14} />
      </button>

      {open && (
        <div className="absolute z-[8000] bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 bg-charcoal-dark text-white text-xs rounded-xl p-3 shadow-xl pointer-events-auto leading-relaxed border border-charcoal-medium">
          {content}
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-t-[6px] border-t-charcoal-dark border-x-[6px] border-x-transparent" />
        </div>
      )}
    </div>
  );
};
