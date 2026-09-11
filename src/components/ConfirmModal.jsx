"use client";
import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ConfirmModal({ isOpen, title, message, onConfirm, onCancel, confirmLabel = "YA, LANJUTKAN", cancelLabel = "BATAL" }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-8"
        >
          <motion.div 
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            transition={{ type: "spring", stiffness: 350, damping: 25 }}
            className="bg-kw-bg rounded-3xl max-w-sm w-full p-6 text-center shadow-2xl border-4 border-kw-border space-y-4 origin-center"
          >
            <div className="w-16 h-16 bg-amber-cream text-amber-deep rounded-full flex items-center justify-center mx-auto text-2xl font-bold animate-pulse">
          <AlertTriangle size={32} />
        </div>
        <div className="space-y-2">
          <h2 className="text-heading text-lg font-bold text-kw-text">{title}</h2>
          <p className="text-xl text-kw-text leading-relaxed font-semibold">
            {message}
          </p>
        </div>
        <div className="flex gap-6 pt-2">
          <button 
            onClick={onCancel}
            className="flex-1 border-2 border-kw-border bg-kw-card hover:bg-gray-50 text-kw-text font-bold h-12 rounded-xl text-xl transition-all cursor-pointer"
          >
            {cancelLabel}
          </button>
          <button 
            onClick={onConfirm}
            className="flex-1 bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-600 text-kw-text font-extrabold h-12 rounded-xl text-xl transition-all shadow-md cursor-pointer"
          >
            {confirmLabel}
          </button>
        </div>
      </motion.div>
    </motion.div>
    )}
    </AnimatePresence>
  );
}
