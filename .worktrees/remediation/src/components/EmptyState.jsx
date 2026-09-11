"use client";
import React from 'react';

export default function EmptyState({ icon: Icon, title, message, actionLabel, onAction }) {
  return (
    <div className="bg-[#FAF7F0] border-4 border-[#E8DCC8] rounded-3xl p-8 md:p-12 flex flex-col items-center text-center space-y-6 max-w-xl mx-auto shadow-sm animate-slide-in">
      <div className="w-16 h-16 bg-white border border-[#E8DCC8] text-[#3D1A0F] rounded-2xl flex items-center justify-center shadow-[0_4px_12px_rgba(61,26,15,0.03)]">
        {Icon ? <Icon size={28} /> : null}
      </div>

      <div className="space-y-2">
        <h3 className="text-lg font-extrabold text-[#3D1A0F] font-heading">{title}</h3>
        <p className="text-xs text-[#6B4F3A] leading-relaxed font-semibold max-w-sm">{message}</p>
      </div>

      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="bg-[#C97B1A] hover:bg-[#A85F10] text-white font-extrabold px-6 h-11 rounded-xl text-xs transition-all shadow-md active:scale-[0.98] cursor-pointer"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
