import React, { useEffect, useState } from 'react';
import { Button } from './Button';

export const ModalAntiBencana = ({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmLabel = 'YA, SAYA YAKIN',
  cancelLabel = 'BATAL',
  isDanger = true,
}) => {
  const [step, setStep] = useState(1);

  // Reset step when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setStep(1);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConfirmClick = () => {
    if (step === 1) {
      setStep(2); // Ask for double confirmation
    } else {
      onConfirm();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-8">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-ink-900/40 backdrop-blur-sm transition-opacity"
        onClick={onCancel}
        aria-hidden="true"
      />
      
      {/* Modal Dialog */}
      <div 
        role="dialog" 
        aria-modal="true" 
        aria-labelledby="modal-title"
        className="relative bg-kw-card w-full max-w-md rounded-2xl shadow-2xl p-6 sm:p-8 animate-slide-in"
      >
        <div className="flex flex-col items-center text-center">
          {/* Large Alert Icon */}
          <div className={`mb-6 p-8 rounded-full ${isDanger ? 'bg-rose-100 text-rose-600' : 'bg-signature-50 text-signature-500'}`}>
            {isDanger ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
                <path d="M12 9v4"/>
                <path d="M12 17h.01"/>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 8v4"/>
                <path d="M12 16h.01"/>
              </svg>
            )}
          </div>
          
          <h2 id="modal-title" className="text-h3 text-signature-900 mb-4">
            {step === 1 ? title : 'Apakah Anda benar-benar yakin?'}
          </h2>
          
          <p className="text-body-lg text-gray-600 mb-8">
            {step === 1 ? message : 'Tindakan ini tidak dapat dibatalkan.'}
          </p>
          
          <div className="flex flex-col sm:flex-row w-full gap-6">
            <Button 
              variant="secondary" 
              onClick={onCancel}
              className="w-full sm:flex-1"
            >
              {cancelLabel}
            </Button>
            <Button 
              variant={isDanger ? 'danger' : 'primary'}
              onClick={handleConfirmClick}
              className="w-full sm:flex-1 font-bold tracking-wide"
            >
              {step === 1 ? confirmLabel : 'YA, TETAP LANJUTKAN'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
