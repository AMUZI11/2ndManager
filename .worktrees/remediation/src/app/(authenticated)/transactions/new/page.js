"use client";
import React from 'react';
import { useRouter } from 'next/navigation';
import TransactionForm from '@/views/TransactionForm';

export default function NewTransactionPage() {
  const router = useRouter();

  const handleSetView = (view) => {
    if (view === 'dashboard') {
      router.push('/dashboard');
    } else if (view === 'customers') {
      router.push('/customers');
    }
  };

  return (
    <TransactionForm 
      setView={handleSetView} 
      editTransactionId={null} 
    />
  );
}
