// src/hooks/useFocusTrap.js
// Custom React Hook untuk Accessible Modal Focus Trap (WCAG 2.1 AAA Compliant)
// Mengisolasi pergerakan tombol Tab dan Shift+Tab di dalam modal serta mengembalikan fokus saat modal tertutup.

import { useEffect, useRef, useCallback } from 'react';

const FOCUSABLE_SELECTOR =
  'button:not([disabled]):not([aria-hidden="true"]), ' +
  '[href]:not([aria-hidden="true"]), ' +
  'input:not([disabled]):not([type="hidden"]):not([aria-hidden="true"]), ' +
  'select:not([disabled]):not([aria-hidden="true"]), ' +
  'textarea:not([disabled]):not([aria-hidden="true"]), ' +
  '[tabindex]:not([tabindex="-1"]):not([aria-hidden="true"])';

/**
 * Hook untuk mengisolasi fokus keyboard di dalam modal interaktif.
 * 
 * @param {React.RefObject} modalRef Ref ke elemen kontainer modal
 * @param {boolean} isOpen Status terbuka/tidaknya modal
 * @param {Object} options Opsi konfigurasi
 * @param {Function} [options.onEscape] Callback saat tombol Escape ditekan
 * @param {React.RefObject} [options.initialFocusRef] Elemen yang diprioritaskan untuk menerima fokus pertama
 * @param {Array} [options.stepDependencies] Dependensi langkah (misal: activeStep) untuk re-kalkulasi elemen fokus
 */
export function useFocusTrap(modalRef, isOpen, options = {}) {
  const { onEscape, initialFocusRef, stepDependencies = [] } = options;
  const previousActiveElement = useRef(null);

  // Ambil elemen-elemen fokus yang visible di dalam modal
  const getFocusableElements = useCallback(() => {
    if (!modalRef.current) return [];
    const elements = Array.from(modalRef.current.querySelectorAll(FOCUSABLE_SELECTOR));
    return elements.filter((el) => {
      // Pastikan elemen tidak tersembunyi
      const style = window.getComputedStyle(el);
      return (
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        el.offsetWidth > 0 &&
        el.offsetHeight > 0
      );
    });
  }, [modalRef]);

  useEffect(() => {
    if (!isOpen) return;

    // Simpan elemen aktif sebelum modal dibuka
    previousActiveElement.current = document.activeElement;

    // Fokuskan ke elemen pertama atau initialFocusRef
    const timer = requestAnimationFrame(() => {
      if (initialFocusRef?.current) {
        initialFocusRef.current.focus();
      } else {
        const focusable = getFocusableElements();
        if (focusable.length > 0) {
          focusable[0].focus();
        }
      }
    });

    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        if (typeof onEscape === 'function') {
          e.preventDefault();
          e.stopPropagation();
          onEscape();
        }
        return;
      }

      if (e.key === 'Tab') {
        const focusable = getFocusableElements();
        if (focusable.length === 0) {
          e.preventDefault();
          return;
        }

        const firstElement = focusable[0];
        const lastElement = focusable[focusable.length - 1];

        if (e.shiftKey) {
          // Shift + Tab: jika di elemen pertama, lompat ke elemen terakhir
          if (document.activeElement === firstElement || !modalRef.current.contains(document.activeElement)) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          // Tab biasa: jika di elemen terakhir, lompat ke elemen pertama
          if (document.activeElement === lastElement || !modalRef.current.contains(document.activeElement)) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    }

    // Dynamic DOM updates listener via MutationObserver
    let observer = null;
    if (modalRef.current && typeof MutationObserver !== 'undefined') {
      observer = new MutationObserver(() => {
        // Jika elemen aktif terlepas dari DOM karena pergantian step
        if (!modalRef.current.contains(document.activeElement)) {
          const focusable = getFocusableElements();
          if (focusable.length > 0) {
            focusable[0].focus();
          }
        }
      });
      observer.observe(modalRef.current, { childList: true, subtree: true });
    }

    window.addEventListener('keydown', handleKeyDown, true);

    return () => {
      cancelAnimationFrame(timer);
      window.removeEventListener('keydown', handleKeyDown, true);
      if (observer) {
        observer.disconnect();
      }

      // Kembalikan fokus ke trigger awal atau input pencarian kasir
      if (previousActiveElement.current && typeof previousActiveElement.current.focus === 'function') {
        try {
          previousActiveElement.current.focus();
        } catch {
          // Fail-safe
        }
      } else {
        const searchInput = document.getElementById('pos-search-input');
        if (searchInput) searchInput.focus();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, onEscape, initialFocusRef, getFocusableElements, ...stepDependencies]);
}

export default useFocusTrap;
