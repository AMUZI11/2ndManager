"use client";
import React, { createContext, useContext, useState, useEffect } from 'react';
import idTranslations from '../../locales/id.json';
import enTranslations from '../../locales/en.json';

const LocaleContext = createContext();

export function LocaleProvider({ children }) {
  const [locale, setLocale] = useState('id'); // Default to ID
  
  // Try to load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('klola_locale');
    if (saved && (saved === 'id' || saved === 'en')) {
      setLocale(saved);
    }
  }, []);

  const toggleLocale = () => {
    const newLocale = locale === 'id' ? 'en' : 'id';
    setLocale(newLocale);
    localStorage.setItem('klola_locale', newLocale);
  };

  const t = (key) => {
    const translations = locale === 'id' ? idTranslations : enTranslations;
    const keys = key.split('.');
    let result = translations;
    
    for (const k of keys) {
      if (result[k] === undefined) {
        console.warn(`Translation key not found: ${key}`);
        return key;
      }
      result = result[k];
    }
    
    return result;
  };

  return (
    <LocaleContext.Provider value={{ locale, toggleLocale, t }}>
      {children}
    </LocaleContext.Provider>
  );
}

export const useLocale = () => useContext(LocaleContext);
