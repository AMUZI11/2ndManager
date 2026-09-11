"use client";
import React, { use } from 'react';
import { useRouter } from 'next/navigation';
import TransactionForm from '@/views/TransactionForm';

export default function EditTransactionPage({ params }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const txId = resolvedParams.id;

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
      editTransactionId={txId} 
    />
  );
}
