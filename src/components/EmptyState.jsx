"use client";
import React from 'react';

export default function EmptyState({ icon: Icon, title, message, actionLabel, onAction, actionClassName }) {
  return (
    <div className="bg-kw-bg border-4 border-kw-border rounded-3xl p-8 md:p-12 flex flex-col items-center text-center space-y-6 max-w-xl mx-auto shadow-sm animate-slide-in">
      <div className="w-16 h-16 bg-kw-card border border-kw-border text-kw-text rounded-2xl flex items-center justify-center shadow-[0_4px_12px_rgba(61,26,15,0.03)]">
        {Icon ? <Icon size={28} /> : null}
      </div>

      <div className="space-y-2">
        <h3 className="text-xl font-extrabold text-kw-text font-heading">{title}</h3>
        <p className="text-lg text-kw-text leading-relaxed font-semibold max-w-md">{message}</p>
      </div>

      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className={actionClassName || "bg-kw-accent hover:bg-[#b06a14] active:scale-[0.97] text-kw-bg font-extrabold px-6 h-12 rounded-xl text-lg transition-all shadow-md cursor-pointer flex items-center justify-center gap-8 min-h-[48px]"}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
