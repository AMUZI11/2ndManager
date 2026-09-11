"use client";
import React from 'react';
import { AlertTriangle } from 'lucide-react';

export default function ConfirmModal({ isOpen, title, message, onConfirm, onCancel, confirmLabel = "YA, LANJUTKAN", cancelLabel = "BATAL" }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="bg-[#FAF7F0] rounded-3xl max-w-sm w-full p-6 text-center shadow-2xl border-4 border-[#E8DCC8] space-y-4">
        <div className="w-16 h-16 bg-amber-cream text-amber-deep rounded-full flex items-center justify-center mx-auto text-2xl font-bold animate-pulse">
          <AlertTriangle size={32} />
        </div>
        <div className="space-y-2">
          <h2 className="text-heading text-lg font-bold text-[#1C1009]">{title}</h2>
          <p className="text-xs text-[#6B4F3A] leading-relaxed font-semibold">
            {message}
          </p>
        </div>
        <div className="flex gap-3 pt-2">
          <button 
            onClick={onCancel}
            className="flex-1 border-2 border-[#E8DCC8] bg-white hover:bg-gray-50 text-[#6B4F3A] font-bold h-12 rounded-xl text-xs transition-all cursor-pointer"
          >
            {cancelLabel}
          </button>
          <button 
            onClick={onConfirm}
            className="flex-1 bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-600 text-white font-extrabold h-12 rounded-xl text-xs transition-all shadow-md cursor-pointer"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
