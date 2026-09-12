"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Dashboard from '@/views/Dashboard';

export default function DashboardPage() {
  const router = useRouter();

  const handleSetView = (view) => {
    if (view === 'customers') {
      router.push('/customers');
    } else if (view === 'reporting') {
      router.push('/reporting');
    } else if (view === 'transaction-form') {
      router.push('/transactions/new');
    }
  };

  const handleSetSelectedCustomer = (id) => {
    router.push(`/customers/${id}`);
  };

  return (
    <Dashboard 
      setView={handleSetView} 
      setSelectedCustomerId={handleSetSelectedCustomer} 
    />
  );
}
