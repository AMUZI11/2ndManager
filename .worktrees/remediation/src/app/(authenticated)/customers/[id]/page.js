"use client";
import React, { use } from 'react';
import { useRouter } from 'next/navigation';
import CustomerDetail from '@/views/CustomerDetail';

export default function CustomerDetailPage({ params }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const customerId = resolvedParams.id;

  const handleSetView = (view) => {
    if (view === 'customers') {
      router.push('/customers');
    } else if (view === 'dashboard') {
      router.push('/dashboard');
    }
  };

  const handleSetEditTransaction = (txId) => {
    router.push(`/transactions/${txId}/edit`);
  };

  return (
    <CustomerDetail 
      customerId={customerId} 
      setView={handleSetView} 
      setEditTransactionId={handleSetEditTransaction} 
    />
  );
}
