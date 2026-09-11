"use client";
import React, { use } from 'react';
import { useRouter } from 'next/navigation';
import TransactionDetail from '@/views/TransactionDetail';

export default function TransactionDetailPage({ params }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const transactionId = resolvedParams.id;

  const handleSetView = (view) => {
    if (view === 'dashboard') {
      router.push('/dashboard');
    } else if (view === 'reporting') {
      router.push('/reporting');
    } else if (view === 'customers') {
      router.push('/customers');
    }
  };

  return (
    <TransactionDetail 
      transactionId={transactionId} 
      setView={handleSetView} 
    />
  );
}
