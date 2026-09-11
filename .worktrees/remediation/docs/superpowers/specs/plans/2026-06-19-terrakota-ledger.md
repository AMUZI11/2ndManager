# Terrakota Ledger Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Menerapkan tema visual premium "Terrakota Ledger" hangat berbasis krem dan cokelat terrakota, merancang halaman login buku kas interaktif, dan memperketat tinggi visual seluruh halaman agar ramah lansia (minim scroll).

**Architecture:** Kita akan memperbarui CSS Variables di file CSS global, lalu menyesuaikan tema di Layout global. Halaman login akan dirancang ulang sebagai komponen "Buku Kas Terbuka", dan area presentasi dashboard serta manajemen akan dioptimalkan ukuran layout vertikalnya.

**Tech Stack:** Next.js App Router, Tailwind CSS v4, Lucide Icons.

---

### Task 1: Global Theme Config in globals.css

**Files:**
- Modify: [globals.css](file:///c:/Users/USER/Desktop/Project/project%20hl/src/app/globals.css)

- [ ] **Step 1: Ubah CSS variables di globals.css**
  Ganti isi `@theme` dan `.nav-active-item` di `src/app/globals.css` dengan nilai warna terrakota hangat.
  
  *Modifikasi kode:*
  ```css
  @theme {
    --color-primary: #3D1A0F;
    --color-secondary: #6B4F3A;
    --color-cta: #C97B1A;
    --color-background: #F6F3EA;
    --color-text: #1C1009;
    
    --font-sans: "Fira Sans", sans-serif;
    --font-mono: "Fira Code", monospace;
    --font-heading: "Fira Code", monospace;
  }
  ```
  
  Serta perbarui `.nav-active-item` di line 139-147 menjadi:
  ```css
  .nav-active-item {
    animation: nav-active-bounce 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
    box-shadow: 
      0 4px 6px -1px rgba(107, 79, 58, 0.05),
      0 2px 4px -1px rgba(107, 79, 58, 0.03);
    border: 1px solid #E8DCC8 !important;
    background-color: #FAF7F0 !important;
    color: #3D1A0F !important;
  }
  ```

- [ ] **Step 2: Jalankan build untuk verifikasi CSS**
  Run: `npm run build`
  Expected: Compiled successfully.

---

### Task 2: Update Layout and Navigation styling

**Files:**
- Modify: [layout.js](file:///c:/Users/USER/Desktop/Project/project%20hl/src/app/(authenticated)/layout.js)

- [ ] **Step 1: Sesuaikan class warna di layout.js**
  Ubah style background sidebar desktop, header mobile, dan bottom nav mobile di `src/app/(authenticated)/layout.js` agar menggunakan warna cokelat tua Terrakota (`bg-[#3D1A0F]`) dan garis tepi `border-[#4E271B]`.
  
  *Modifikasi kode sidebar desktop:*
  ```jsx
  // Ubah class sidebar <aside> di line 111:
  <aside className="hidden lg:flex flex-col w-[280px] bg-[#3D1A0F] border border-[#4E271B] rounded-3xl p-6 space-y-6 flex-shrink-0 shadow-xl justify-between">
  ```

  *Modifikasi link navigasi aktif di line 127-131:*
  ```jsx
  isActive 
    ? 'bg-cta text-white shadow-md shadow-cta/20' 
    : 'text-slate-300 hover:bg-slate-800/40 hover:text-white hover:translate-x-1'
  ```

  *Modifikasi mobile header di line 155:*
  ```jsx
  <header className="lg:hidden h-16 bg-[#3D1A0F] border-b border-[#4E271B] shadow-sm px-4 flex items-center justify-between z-30 sticky top-0">
  ```

  *Modifikasi mobile bottom navigation di line 188:*
  ```jsx
  <nav className="lg:hidden fixed bottom-4 left-4 right-4 h-20 bg-[#3D1A0F]/95 backdrop-blur-md border border-[#4E271B] rounded-3xl shadow-xl flex items-center justify-around px-2 z-[40]">
  ```

- [ ] **Step 2: Jalankan build untuk verifikasi Layout**
  Run: `npm run build`
  Expected: Compiled successfully.

---

### Task 3: Redesign Login Page (Login.jsx)

**Files:**
- Modify: [Login.jsx](file:///c:/Users/USER/Desktop/Project/project%20hl/src/views/Login.jsx)

- [ ] **Step 1: Terapkan struktur "Buku Kas Terbuka" di Login.jsx**
  Ganti implementasi `Login.jsx` dengan visualisasi buku kas terbuka yang responsif.
  
  *Ganti fungsi return di Login.jsx menjadi:*
  ```jsx
  return (
    <div className="min-h-screen bg-[#3D1A0F] flex items-center justify-center p-4 md:p-8 font-sans">
      <div className="w-full max-w-5xl bg-[#F6F3EA] rounded-[2.5rem] shadow-2xl overflow-hidden border-4 border-[#4E271B] p-1.5">
        <div className="bg-[#FAF7F0] border border-[#E8DCC8] rounded-[calc(2.5rem-0.375rem)] p-8 md:p-12 min-h-[500px] grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 relative">
          
          {/* Sisi Kiri: Sampul/Halaman Info Buku Kas */}
          <div className="flex flex-col justify-between space-y-6 lg:border-r lg:border-[#E8DCC8] lg:pr-12">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-[#3D1A0F] text-white border border-[#4E271B] rounded-2xl flex items-center justify-center font-bold text-xl font-heading">
                HL
              </div>
              <div>
                <span className="text-xs font-black tracking-widest uppercase text-[#3D1A0F] block">Sales & Receivables</span>
                <span className="text-[10px] text-[#6B4F3A] font-bold uppercase tracking-wider">Buku Kas Digital</span>
              </div>
            </div>

            <div className="space-y-6 my-auto">
              <h1 className="text-2xl md:text-3xl leading-tight font-extrabold text-[#3D1A0F] font-heading">
                Pencatatan Penjualan &amp; Piutang <span className="text-cta">Akrab &amp; Terpercaya</span>.
              </h1>
              
              <div className="space-y-3.5">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-white border border-[#E8DCC8] rounded-lg flex items-center justify-center text-[#3D1A0F]">
                    📖
                  </div>
                  <span className="text-sm font-bold text-[#6B4F3A]">Catat Bon &amp; Tagihan Piutang Pelanggan</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-white border border-[#E8DCC8] rounded-lg flex items-center justify-center text-[#3D1A0F]">
                    💰
                  </div>
                  <span className="text-sm font-bold text-[#6B4F3A]">Rekap Kas Omzet &amp; Laba Bersih Otomatis</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-white border border-[#E8DCC8] rounded-lg flex items-center justify-center text-[#3D1A0F]">
                    🔒
                  </div>
                  <span className="text-sm font-bold text-[#6B4F3A]">Akses Pembukuan Pribadi &amp; Aman</span>
                </div>
              </div>
            </div>

            <div className="text-[10px] text-[#6B4F3A]/70 font-bold uppercase tracking-wider">
              Aplikasi Internal • Rupiah (IDR)
            </div>
          </div>

          {/* Sisi Kanan: Form Masuk */}
          <div className="flex flex-col justify-center max-w-sm mx-auto w-full space-y-6">
            <div className="space-y-2">
              <h2 className="text-2xl font-extrabold tracking-tight text-[#3D1A0F] font-heading">Bapak/Ibu, Silakan Masuk</h2>
              <p className="text-xs text-[#6B4F3A] font-semibold">Masukkan Username dan Kata Sandi Anda di bawah ini.</p>
            </div>

            {errorMsg && (
              <div className="bg-rose-50 border border-rose-100 text-rose-800 p-4 rounded-2xl text-xs font-bold flex items-start gap-2 border-rose-light/50 animate-shake">
                <ShieldAlert className="flex-shrink-0" size={16} />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label className="block text-[11px] font-bold text-[#6B4F3A] uppercase tracking-wider">Nama Pengguna (Username)</label>
                <input 
                  type="text" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Masukkan nama pengguna"
                  className="w-full h-12 bg-white border border-[#E8DCC8] rounded-xl px-4 text-sm focus:border-[#ca8a04] outline-none transition-all font-semibold text-[#1C1009]"
                  autoFocus
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="block text-[11px] font-bold text-[#6B4F3A] uppercase tracking-wider">Kata Sandi (Password)</label>
                <div className="relative">
                  <input 
                    type={showPassword ? "text" : "password"} 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Masukkan kata sandi"
                    className="w-full h-12 bg-white border border-[#E8DCC8] rounded-xl pl-4 pr-12 text-sm focus:border-[#ca8a04] outline-none transition-all font-semibold text-[#1C1009]"
                    required
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button 
                type="submit"
                className="w-full bg-[#C97B1A] hover:bg-[#A85F10] text-white font-extrabold h-12 rounded-xl text-sm shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
              >
                <Lock size={16} /> Buka Pembukuan
              </button>
            </form>
          </div>

        </div>
      </div>
    </div>
  );
  ```

- [ ] **Step 2: Jalankan build untuk verifikasi Login Page**
  Run: `npm run build`
  Expected: Compiled successfully.

---

### Task 4: Optimize Dashboard Layout for Senior Scrolling

**Files:**
- Modify: [Dashboard.jsx](file:///c:/Users/USER/Desktop/Project/project%20hl/src/views/Dashboard.jsx)

- [ ] **Step 1: Kurangi transaksi yang tampil dan padding dashboard**
  Perbarui `src/views/Dashboard.jsx` untuk membatasi list transaksi menjadi 3, mengurangi padding, dan mengubah style banner agar lebih warm.
  
  *Modifikasi list limit di line 55:*
  ```javascript
  setRecentTx(sorted.slice(0, 3));
  ```

  *Modifikasi Welcome Banner di line 90-98:*
  ```jsx
  <div className="bg-[#3D1A0F] border border-[#4E271B] text-white rounded-[2rem] p-6 shadow-sm relative overflow-hidden">
    <div className="relative z-10 space-y-1.5 max-w-xl">
      <h1 className="text-display text-white text-xl md:text-2xl">Selamat Bekerja, Bapak/Ibu! 👋</h1>
      <p className="text-white/80 text-xs">Aplikasi pencatatan penjualan HL Manager Pro siap membantu Anda memantau kas, diskon bertingkat, dan tagihan piutang tanpa ribet.</p>
    </div>
    <div className="absolute right-0 top-0 bottom-0 opacity-10 flex items-center justify-center pr-8 pointer-events-none">
      <TrendingUp size={120} />
    </div>
  </div>
  ```

  *Modifikasi header tabel agar menggunakan teks cokelat sekunder di line 193:*
  ```jsx
  <tr className="border-b border-[#E8DCC8] text-xs text-[#6B4F3A] uppercase font-bold">
  ```

- [ ] **Step 2: Jalankan build**
  Run: `npm run build`
  Expected: Compiled successfully.

---

### Task 5: Spacing and Modal Optimizations in Customer & Product Management

**Files:**
- Modify: [CustomerManagement.jsx](file:///c:/Users/USER/Desktop/Project/project%20hl/src/views/CustomerManagement.jsx)
- Modify: [ProductManagement.jsx](file:///c:/Users/USER/Desktop/Project/project%20hl/src/views/ProductManagement.jsx)

- [ ] **Step 1: Sesuaikan border dan background modal di CustomerManagement.jsx**
  Perbarui modal container agar memiliki border `#E8DCC8` dan background `#FAF7F0` serta tombol simpannya.
  
  *Modifikasi di CustomerManagement.jsx line 324-325:*
  ```jsx
  <div className="bg-[#FAF7F0] rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6 relative border-4 border-[#E8DCC8]">
  ```

  *Modifikasi di line 447:*
  ```jsx
  className="flex-1 bg-[#C97B1A] hover:bg-[#A85F10] text-white font-bold h-12 rounded-xl text-sm shadow-md cursor-pointer font-mono"
  ```

- [ ] **Step 2: Sesuaikan border dan background modal di ProductManagement.jsx**
  Cari file `ProductManagement.jsx` dan perbarui modal popup-nya dengan cara yang serupa.
  
  *Buka ProductManagement.jsx untuk review bagian modal. (Kita akan ubah saat eksekusi).*

- [ ] **Step 3: Jalankan build dan lint**
  Run: `npm run build && npm run lint`
  Expected: BUILD SUCCESS & NO LINT ERRORS.
