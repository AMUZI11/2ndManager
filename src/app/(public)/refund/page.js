import React from 'react';
import { RefreshCw, CheckCircle2, ShieldCheck, MessageCircle, Clock, Banknote } from 'lucide-react';
import Breadcrumbs from '@/components/public/Breadcrumbs';

export const metadata = {
  title: 'Garansi 7 Hari 100% Uang Kembali (Refund Policy)',
  description:
    'Kebijakan pengembalian dana tanpa ribet 2ndManager: garansi 7 hari 100% uang kembali jika sistem tidak cocok untuk warung Anda. Diproses 2x24 jam kerja via WhatsApp.',
};

export default function RefundPolicyPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Semantic Breadcrumbs */}
      <Breadcrumbs
        items={[
          { label: 'Beranda', href: '/' },
          { label: 'Garansi 7 Hari' },
        ]}
      />

      {/* Header Banner */}
      <div className="bg-[#10B981] border-3 border-[#0B0F17] rounded-2xl p-6 md:p-8 shadow-[6px_6px_0px_#0B0F17]">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-[#0B0F17] text-amber-400 font-mono font-black text-xs uppercase mb-3">
          <ShieldCheck size={16} /> JAMINAN TANPA RESIKO
        </div>
        <h1 className="font-display font-black text-2xl md:text-4xl text-[#0B0F17] uppercase tracking-tight">
          Garansi 7 Hari 100% Uang Kembali
        </h1>
        <p className="text-sm md:text-base text-slate-950 font-sans font-semibold mt-2">
          Jika dalam 7 hari pertama Anda merasa 2ndManager tidak cocok atau kasir Anda kesulitan menggunakannya, kami kembalikan uang Anda 100% tanpa tanya.
        </p>
        <p className="text-xs font-mono font-bold text-slate-900 mt-3">
          Proses Pencairan Cepat: Maksimal 2x24 Jam Kerja Langsung ke Rekening Bank / QRIS Anda
        </p>
      </div>

      {/* 3 Step Refund Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border-3 border-[#0B0F17] rounded-xl p-5 shadow-[4px_4px_0px_#0B0F17] space-y-2">
          <div className="w-8 h-8 rounded-lg bg-amber-400 border-2 border-[#0B0F17] font-mono font-black text-sm flex items-center justify-center text-slate-900">
            1
          </div>
          <h3 className="font-display font-black text-base text-[#0B0F17]">Hubungi WhatsApp</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Kirim pesan ke nomor WhatsApp CS Resmi kami dengan format: <code>KLAIM REFUND [Nama Toko] [Email Akun]</code>.
          </p>
        </div>

        <div className="bg-white border-3 border-[#0B0F17] rounded-xl p-5 shadow-[4px_4px_0px_#0B0F17] space-y-2">
          <div className="w-8 h-8 rounded-lg bg-amber-400 border-2 border-[#0B0F17] font-mono font-black text-sm flex items-center justify-center text-slate-900">
            2
          </div>
          <h3 className="font-display font-black text-base text-[#0B0F17]">Kirim Nomor Rekening</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Sertakan nomor rekening bank lokal (BCA, BRI, Mandiri, BNI, BSI) atau nomor ponsel e-wallet (GoPay, OVO, Dana).
          </p>
        </div>

        <div className="bg-white border-3 border-[#0B0F17] rounded-xl p-5 shadow-[4px_4px_0px_#0B0F17] space-y-2">
          <div className="w-8 h-8 rounded-lg bg-amber-400 border-2 border-[#0B0F17] font-mono font-black text-sm flex items-center justify-center text-slate-900">
            3
          </div>
          <h3 className="font-display font-black text-base text-[#0B0F17]">Dana Masuk 2x24 Jam</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Tim keuangan kami akan mentransfer dana Anda secara utuh 100% tanpa potongan biaya administrasi.
          </p>
        </div>
      </div>

      {/* Detail Conditions */}
      <div className="bg-white border-3 border-[#0B0F17] rounded-2xl p-6 md:p-10 shadow-[6px_6px_0px_#0B0F17] space-y-6 font-sans text-slate-800 leading-relaxed text-sm md:text-base">
        <h2 className="font-display font-black text-lg md:text-xl text-[#0B0F17] uppercase flex items-center gap-2 border-b-2 border-slate-200 pb-2">
          <Banknote className="text-emerald-600" size={24} />
          Ketentuan Garansi Pengembalian Dana
        </h2>

        <ul className="space-y-3 text-sm">
          <li className="flex items-start gap-2.5">
            <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
            <span><strong>Periode Klaim:</strong> Permohonan diajukan maksimal 7 hari kalender (7 x 24 jam) terhitung sejak tanggal pembayaran aktivasi paket langganan (Supervisor, Manajer, atau Eksekutif) pertama kali berhasil.</span>
          </li>
          <li className="flex items-start gap-2.5">
            <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
            <span><strong>Tanpa Pertanyaan Menjebak:</strong> Anda tidak perlu membuktikan alasan rumit. Cukup sampaikan bahwa Anda ingin refund, dan tim kami akan langsung memprosesnya.</span>
          </li>
          <li className="flex items-start gap-2.5">
            <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
            <span><strong>Keamanan Data Pasca-Refund:</strong> Akun Anda akan dialihkan secara otomatis ke Paket Magang (Gratis). Seluruh data transaksi historis yang telah Anda input tetap tersimpan aman dan tidak akan dihapus.</span>
          </li>
        </ul>

        {/* CTA Direct Link */}
        <div className="pt-4 border-t border-slate-200">
          <a
            href="https://wa.me/6285188789773?text=Halo%20Admin%202ndManager,%20saya%20ingin%20mengajukan%20klaim%20garansi%20refund%207%20hari"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-mono font-black text-sm border-2 border-[#0B0F17] shadow-[4px_4px_0px_#0B0F17] active:translate-x-[1px] active:translate-y-[1px] transition-all cursor-pointer"
          >
            <MessageCircle size={18} />
            <span>KLAIM GARANSI REFUND VIA WHATSAPP RESMI</span>
          </a>
        </div>
      </div>
    </div>
  );
}
