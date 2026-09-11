import React from 'react';

export default function ModalAntiBencana({ isOpen, title, message, onConfirm, onCancel, confirmLabel = "YA, LANJUTKAN", cancelLabel = "BATAL" }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-8 animate-fade-in">
      <div className="bg-kw-card rounded-3xl max-w-sm w-full p-6 shadow-2xl border-4 border-rose-500 space-y-4">
        <h3 className="text-xl font-black text-rose-600 font-heading text-center uppercase tracking-wider">{title}</h3>
        <p className="text-lg text-gray-700 text-center font-medium leading-relaxed">
          {message}
        </p>
        <div className="flex flex-col gap-6 pt-4">
          <button
            type="button"
            onClick={onConfirm}
            className="w-full py-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-kw-text font-black text-lg text-center shadow-md transition-all active:scale-95"
          >
            {confirmLabel}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="w-full py-4 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-lg transition-all"
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
