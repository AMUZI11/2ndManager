"use client";
import React from 'react';
import { useRouter } from 'next/navigation';
import HelpCenter from '@/views/HelpCenter';

export default function HelpPage() {
  const router = useRouter();

  const handleSetView = (view) => {
    if (view === 'dashboard') {
      router.push('/dashboard');
    } else if (view === 'customers') {
      router.push('/customers');
    } else if (view === 'products') {
      router.push('/products');
    } else if (view === 'transaction-form') {
      router.push('/transactions/new');
    } else if (view === 'reporting') {
      router.push('/reporting');
    }
  };

  return <HelpCenter setView={handleSetView} />;
}
