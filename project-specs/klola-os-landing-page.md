# Meja Bundar Obsidian: Merancang Landing Page Klola OS

## 👥 Kenalan Dulu dengan Anggota Meja

| Nama | Latar Belakang | Kepentingan Utama | Musuh Bebuyutannya |
|---|---|---|---|
| **Isabella Wirjono** | Ex-Creative Director rebranding rumah lelang antik & private banking Swiss. 15 tahun hidup di dunia "quiet luxury". | Autentisitas visual, tidak norak, tidak "ai slop". | Marcus (dianggap merusak elegansi demi angka). |
| **Marcus Halim** | Growth/CRO specialist, murid langsung filosofi *direct response* ala Hormozi & Halbert. Sudah scale 40+ funnel high-ticket. | Konversi, urgensi, value stacking. | Isabella (dianggap "estetika doang, gak jualan"). |
| **Dr. Sarah Amelia** | Peneliti UX gerontologi (khusus pengguna lansia & presbiopia). Riset 10 tahun tentang UI untuk usia 50+. | Keterbacaan, cognitive load rendah, aksesibilitas. | Rendra (efek visualnya sering bikin kontras jelek). |
| **Rendra Kusuma** | Creative technologist, spesialis glassmorphism & motion, portofolio Awwwards. | Eksekusi teknis, performa, keunikan visual. | Sarah (dianggap "mau bikin semuanya polos demi aksesibilitas"). |
| **Bagas Prakoso** | Bukan orang tech — pemilik warung kelontong generasi ke-3 di Solo, sekarang jadi konsultan UMKM. | Suara realitas pengguna akhir. Anti-jargon. | Semua orang di ruangan (dianggap "kejauhan dari lapangan"). |

## ⚔️ SESI 1 — HERO SECTION
- Headline besar, serif elegan, warna gold di atas midnight — bukan merah.
- Copy: Agitate (besar) → Validate (subheadline lebih kecil, warna cream, nada empatik: *"Kami tahu, Bapak/Ibu tidak pernah benar-benar libur memikirkan warung ini."*)
- Satu CTA utama saja: **"Lihat Kebocoran Saya"** (bukan "Daftar Sekarang" yang generik) — mengarah ke kalkulator, bukan langsung ke checkout.
- Visual hero: siluet gerbang brankas besar setengah terbuka, cahaya emas samar dari dalam (Aurora Embers), tekstur logam terracotta gelap di kiri-kanan sebagai framing (bukan foto stok orang tersenyum generik).

## ⚔️ SESI 2 — SECTION "3 PENCURI TERBESAR" (Agitasi Masalah)
- Layout: 3 panel pintu brankas (glass oxblood, rim gold) → interaksi tap-to-open.
- Di bawahnya: Kalkulator Kebocoran dengan kontrol +/- besar + slider brass sebagai pelengkap visual.
- Copy tone: campuran → judul teknis elegan ("Detektor Stok Presisi"), tapi deskripsi di bawahnya pakai bahasa curhat pedagang ("Karyawan Bapak/Ibu bisa saja bilang stoknya emang segitu. Sistem ini yang akan membuktikan sebaliknya.")

## ⚔️ SESI 3 — SECTION FITUR / SOLUSI
- Kartu fitur: "Smoked Glass Plate" — `bg-vault-oxblood/70` + `backdrop-blur-md`, sudut clipped-corner, rim-light gold 1px di sisi atas-kiri, shadow tebal `vault-coffee` di sisi bawah-kanan (memberi ilusi lempengan logam menonjol/embossed).
- Icon custom bertema mekanikal brankas, bukan generic icon set.
- Copy tiap kartu: **Fitur → Hasil Psikologis**, bukan sekadar spesifikasi teknis.

## ⚔️ SESI 4 — WORKFLOW VIP CONCIERGE (Tier 2)
- Timeline 4 tahap bergaya "jalur pewarisan", garis emas tipis.
- Setiap tahap disertai foto asli tim (bukan ilustrasi/avatar AI), dengan gaya foto formal-hangat (batik/kemeja, senyum tenang, bukan foto stok korporat).
- Sertakan mockup percakapan WhatsApp nyata sebagai bukti kehangatan proses.
- Scroll-triggered reveal ringan, bukan animasi berat.

## ⚔️ SESI 5 — PRICING / VALUE STACK
- Dua kartu harga bergaya **ledger/kwitansi kuno** di atas kertas krem, tulisan gelap kecoklatan + aksen tinta emas.
- Value stack ditulis seperti daftar pos pembukuan (kolom kiri: item, kolom kanan: nilai, baris terakhir: total & harga final).
- Tier VIP diberi stempel lilin emboss, bukan ribbon flat.
- Copy tetap menghormati kedua tier ("Untuk yang baru mulai" vs "Untuk yang serius menjaga warisan" — bukan "basic" vs "premium").

## ⚔️ SESI 6 — SOSIAL PROOF & GARANSI
- Testimoni dalam bentuk "surat/nota" di atas tekstur cream, dengan nama pemilik, nama warung, kota, dan angka konkret hasil.
- Garansi dibungkus sebagai stempel lilin emboss "Jaminan Kunci Emas".

## ⚔️ SESI 7 — NAVIGASI, CTA MENGAMBANG & FOOTER
- Satu halaman panjang (single scroll), tanpa nav kompleks.
- Floating CTA WhatsApp: badan gold, ikon WA asli kecil di dalamnya.
- Footer padat: alamat, kontak besar, ringkasan testimoni, motif garis emas peta arsipelago Indonesia sebagai penegas jangkauan & legitimasi.

## 📐 DESIGN SYSTEM FINAL (Hasil Sintesis Meja Bundar)

### Tipografi
| Elemen | Font Karakter | Alasan |
|---|---|---|
| Heading/Display | Serif hangat, tidak terlalu tipis (mis. gaya **Fraunces/Lora**) | Kesan old money, x-height cukup besar agar terbaca lansia. |
| Body | Sans-serif humanis, ukuran dasar **min 16-18px**, line-height lega | Prioritas keterbacaan di atas tren. |
| Aksen | Script tebal terbatas | Hanya dekoratif. |

### Warna
- `vault-midnight` → kanvas dasar, 60% luas halaman.
- `vault-oxblood` → panel glass/konten.
- `vault-coffee` → shadow & border bawah (ilusi kedalaman/emboss).
- `vault-gold` → aksen, CTA, rim-light — maksimal 10% area.
- `vault-cream` → break kontras di section testimoni & pricing (ledger paper).
- `brick-dark/light` → indikator teknis/peringatan kecil.

### Komponen Kunci
1. **Smoked Glass Plate** — panel utama fitur (blur medium, opacity 60-70%, clipped-corner, rim-light gold).
2. **Vault Door Toggle** — interaksi FAQ/agitasi masalah, membuka seperti pintu brankas.
3. **Ledger Card** — pricing & testimoni, latar cream, tinta gelap+emas.
4. **Wax Seal Badge** — garansi & "Rekomendasi Utama".
5. **Aurora Ember Glow** — animasi breathing halus di CTA utama, hormat pada `prefers-reduced-motion`.

### Prinsip Motion
- CSS/SVG ringan, scroll reveal pelan (400-600ms ease-out).
- Tidak ada animasi bounce/elastic.

### Prinsip Aksesibilitas
- Kontras teks minimal AA, target AAA.
- Tap target minimal 48x48px.
- Tidak ada interaksi hover-only.
- Copy pendek per paragraf, bebas jargon.

## 🗺️ Blueprint Alur Halaman Final
1. Hero
2. 3 Pintu Brankas (Masalah + Kalkulator)
3. Fitur (Smoked Glass Plates)
4. Perbandingan Metode Lama vs Klola OS
5. Alur VIP Concierge
6. Nota Investasi (Pricing)
7. Surat Testimoni
8. Jaminan Kunci Emas
9. FAQ Vault Door
10. CTA Penutup + Footer padat
