"use client";
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Printer, Bluetooth, Usb, Sliders, CheckCircle2, X, Play, RefreshCw, Zap } from 'lucide-react';
import useFocusTrap from '@/hooks/useFocusTrap';
import { getPrinterConfig, savePrinterConfig } from '@/utils/printerConfig';
import { testPrinterDirect, kickCashDrawerDirect } from '@/utils/escposPrinter';

/**
 * Modal Pengaturan Perangkat Keras Printer Thermal ESC/POS
 * Mengatur tipe koneksi (Bluetooth/USB) & lebar kertas (58mm/80mm)
 */
export default function PrinterSettingsModal({ isOpen, onClose }) {
  const modalRef = useRef(null);
  const [config, setConfig] = useState(() => getPrinterConfig());
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState('');

  useFocusTrap(modalRef, isOpen, {
    onEscape: onClose,
    stepDependencies: [config.connectionType, config.paperWidth],
    autoFocusFirst: true,
  });

  if (!isOpen) return null;

  const handleSave = () => {
    savePrinterConfig(config);
    setTestResult('Pengaturan printer berhasil disimpan.');
    setTimeout(() => {
      onClose();
    }, 800);
  };

  const handleTestPrint = async () => {
    setTesting(true);
    setTestResult('Mengirim perintah cetak uji coba...');
    try {
      await testPrinterDirect(config);
      setTestResult('Perintah cetak uji coba berhasil dikirim!');
    } catch (err) {
      setTestResult(`Gagal cetak: ${err.message || 'Perangkat tidak merespons'}`);
    } finally {
      setTesting(false);
    }
  };

  const handleTestDrawer = async () => {
    setTesting(true);
    setTestResult('Mengirim perintah buka laci kas...');
    try {
      const ok = await kickCashDrawerDirect(config);
      if (ok) {
        setTestResult('Sinyal pulse laci kasir berhasil dikirim!');
      } else {
        setTestResult('Gagal mengirim sinyal ke laci kasir.');
      }
    } catch (err) {
      setTestResult(`Gagal buka laci: ${err.message}`);
    } finally {
      setTesting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[10000] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto font-sans">
        <motion.div
          ref={modalRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="printer-settings-title"
          initial={{ scale: 0.95, y: 20, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.95, y: 20, opacity: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 28 }}
          className="bg-white rounded-2xl max-w-md w-full shadow-[8px_8px_0px_#1E293B] border-2 border-slate-800 overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="bg-slate-900 text-[#CCFF00] p-4 flex items-center justify-between border-b-2 border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#CCFF00]/20 flex items-center justify-center border border-[#CCFF00]/40">
                <Printer size={18} className="text-[#CCFF00]" strokeWidth={2.5} />
              </div>
              <div>
                <h3 id="printer-settings-title" className="font-extrabold text-sm uppercase tracking-wider font-mono">
                  Pengaturan Printer Hardware
                </h3>
                <p className="text-[11px] text-white/70">
                  Driver ESC/POS Thermal Struk Kasir
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
              aria-label="Tutup Pengaturan Printer"
            >
              <X size={18} strokeWidth={2.5} />
            </button>
          </div>

          {/* Body */}
          <div className="p-5 space-y-4">
            {/* Tipe Koneksi */}
            <div className="space-y-1.5">
              <label className="text-xs font-mono font-bold text-slate-700 uppercase block">
                Tipe Koneksi Hardware:
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setConfig((prev) => ({ ...prev, connectionType: 'BLUETOOTH' }))}
                  className={`p-2.5 rounded-xl border-2 font-mono text-xs font-bold flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                    config.connectionType === 'BLUETOOTH'
                      ? 'border-slate-900 bg-amber-400 text-slate-950 shadow-[2px_2px_0px_#0B0F17]'
                      : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-400'
                  }`}
                >
                  <Bluetooth size={16} strokeWidth={2.5} />
                  <span>Bluetooth</span>
                </button>

                <button
                  type="button"
                  onClick={() => setConfig((prev) => ({ ...prev, connectionType: 'USB_SERIAL' }))}
                  className={`p-2.5 rounded-xl border-2 font-mono text-xs font-bold flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                    config.connectionType === 'USB_SERIAL'
                      ? 'border-slate-900 bg-amber-400 text-slate-950 shadow-[2px_2px_0px_#0B0F17]'
                      : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-400'
                  }`}
                >
                  <Usb size={16} strokeWidth={2.5} />
                  <span>USB Serial</span>
                </button>

                <button
                  type="button"
                  onClick={() => setConfig((prev) => ({ ...prev, connectionType: 'BROWSER_FALLBACK' }))}
                  className={`p-2.5 rounded-xl border-2 font-mono text-xs font-bold flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                    config.connectionType === 'BROWSER_FALLBACK'
                      ? 'border-slate-900 bg-amber-400 text-slate-950 shadow-[2px_2px_0px_#0B0F17]'
                      : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-400'
                  }`}
                >
                  <Sliders size={16} strokeWidth={2.5} />
                  <span>Dialog Web</span>
                </button>
              </div>
            </div>

            {/* Lebar Kertas */}
            <div className="space-y-1.5">
              <label className="text-xs font-mono font-bold text-slate-700 uppercase block">
                Lebar Kertas Struk:
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setConfig((prev) => ({ ...prev, paperWidth: '58MM', columns: 32 }))}
                  className={`p-2.5 rounded-xl border-2 font-mono text-xs font-bold text-left transition-all cursor-pointer ${
                    config.paperWidth === '58MM'
                      ? 'border-slate-900 bg-slate-900 text-[#CCFF00] shadow-[2px_2px_0px_#CCFF00]'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-400'
                  }`}
                >
                  <span className="block font-black">58 mm (Portabel)</span>
                  <span className="text-[10px] text-slate-400 font-normal">32 Kolom Karakter</span>
                </button>

                <button
                  type="button"
                  onClick={() => setConfig((prev) => ({ ...prev, paperWidth: '80MM', columns: 48 }))}
                  className={`p-2.5 rounded-xl border-2 font-mono text-xs font-bold text-left transition-all cursor-pointer ${
                    config.paperWidth === '80MM'
                      ? 'border-slate-900 bg-slate-900 text-[#CCFF00] shadow-[2px_2px_0px_#CCFF00]'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-400'
                  }`}
                >
                  <span className="block font-black">80 mm (Desktop)</span>
                  <span className="text-[10px] text-slate-400 font-normal">48 Kolom Karakter</span>
                </button>
              </div>
            </div>

            {/* Opsi Hardware Tambahan */}
            <div className="space-y-2 pt-1 border-t border-slate-200">
              <label className="flex items-center gap-2.5 cursor-pointer text-xs font-sans text-slate-800">
                <input
                  type="checkbox"
                  checked={config.autoKickDrawer}
                  onChange={(e) => setConfig((prev) => ({ ...prev, autoKickDrawer: e.target.checked }))}
                  className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-[#CCFF00]"
                />
                <span className="font-bold">Otomatis tendang / buka laci kas saat transaksi tunai</span>
              </label>

              {config.paperWidth === '80MM' && (
                <label className="flex items-center gap-2.5 cursor-pointer text-xs font-sans text-slate-800">
                  <input
                    type="checkbox"
                    checked={config.autoCutPaper}
                    onChange={(e) => setConfig((prev) => ({ ...prev, autoCutPaper: e.target.checked }))}
                    className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-[#CCFF00]"
                  />
                  <span className="font-bold">Kirim sinyal potong kertas otomatis (Autocutter)</span>
                </label>
              )}
            </div>

            {/* Test Hardware Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                disabled={testing}
                onClick={handleTestPrint}
                className="btn-arcade px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-900 border-2 border-slate-800 shadow-[1.5px_1.5px_0px_#1E293B] font-mono text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Play size={13} strokeWidth={2.5} />
                <span>Tes Cetak</span>
              </button>

              <button
                type="button"
                disabled={testing}
                onClick={handleTestDrawer}
                className="btn-arcade px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-900 border-2 border-slate-800 shadow-[1.5px_1.5px_0px_#1E293B] font-mono text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Zap size={13} strokeWidth={2.5} />
                <span>Tes Laci</span>
              </button>
            </div>

            {/* Feedback Message */}
            {testResult && (
              <div className="p-2.5 bg-amber-50 border border-amber-300 rounded-lg text-xs font-mono text-amber-900">
                {testResult}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 bg-slate-100 border-t-2 border-slate-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-mono font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="btn-arcade px-5 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs font-mono uppercase rounded-xl border-2 border-slate-900 shadow-[3px_3px_0px_#0B0F17] flex items-center gap-2 cursor-pointer"
            >
              <CheckCircle2 size={15} strokeWidth={2.5} />
              <span>Simpan Pengaturan</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
