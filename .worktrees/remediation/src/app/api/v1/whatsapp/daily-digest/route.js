import { NextResponse } from 'next/server';
import { withBossOnly, checkSubscription, errorResponse } from '@/lib/auth-helpers';
import { createClient } from '@/lib/supabase';

export const POST = withBossOnly(async (request, context, user) => {
  // Enforce PRO tier
  if (!checkSubscription(user, 'PRO')) {
    return errorResponse('Fitur ini memerlukan langganan tier PRO.', 'UPGRADE_REQUIRED', 403);
  }

  // Use Supabase client for data access (DO NOT USE PRISMA)
  const supabase = createClient();

  // Mock data fetching for today's sales
  // In a real scenario, this would query Supabase for actual sales data
  const mockSalesData = {
    totalSales: 2500000,
    totalTransactions: 35,
    date: new Date().toISOString().split('T')[0]
  };

  // Simulate sending WhatsApp message

  return NextResponse.json({
    success: true,
    message: 'WhatsApp daily digest message queued successfully.',
    data: mockSalesData
  });
});
