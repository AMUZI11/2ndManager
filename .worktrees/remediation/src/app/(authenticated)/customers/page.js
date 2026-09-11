"use client";
import React from 'react';
import { useRouter } from 'next/navigation';
import CustomerManagement from '@/views/CustomerManagement';

export default function CustomersPage() {
  const router = useRouter();

  const handleSetView = (view) => {
    if (view === 'dashboard') {
      router.push('/dashboard');
    }
  };

  const handleSetSelectedCustomer = (id) => {
    router.push(`/customers/${id}`);
  };

  return (
    <CustomerManagement 
      setView={handleSetView} 
      setSelectedCustomerId={handleSetSelectedCustomer} 
    />
  );
}
