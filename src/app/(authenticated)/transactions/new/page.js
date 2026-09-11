"use client";
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function NewTransactionPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/pos');
  }, [router]);

  return null;
}
