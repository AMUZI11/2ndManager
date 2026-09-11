import { withBossOnly, errorResponse, checkSubscription } from '@/lib/auth-helpers';
import { createClient } from '@/lib/supabase';

function arrayToCSV(data) {
  if (!data || data.length === 0) return '';
  const headers = Object.keys(data[0]);
  const rows = data.map(row =>
    headers.map(header => {
      const value = row[header];
      if (value === null || value === undefined) return '';
      const stringValue = String(value);
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    }).join(',')
  );
  return [headers.join(','), ...rows].join('\n');
}

export const GET = withBossOnly(async (request, context, user) => {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');

  if (!type || (type !== 'sales' && type !== 'master')) {
    return errorResponse('Invalid export type', 'INVALID_TYPE', 400);
  }

  // FREE tier is blocked completely
  if (!checkSubscription(user, 'STARTER')) {
    return errorResponse('Export CSV requires at least STARTER tier', 'UPGRADE_REQUIRED', 403);
  }

  const supabase = createClient();
  let csvData = '';
  let filename = '';

  if (type === 'sales') {
    // Requires minimum STARTER tier (already checked above)
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (error) {
      return errorResponse('Failed to fetch transactions', 'DB_ERROR', 500);
    }
    
    csvData = arrayToCSV(transactions || []);
    filename = `export-sales-${new Date().toISOString().split('T')[0]}.csv`;
  } else if (type === 'master') {
    // Requires minimum PLUS tier
    if (!checkSubscription(user, 'PLUS')) {
      return errorResponse('Export master data requires at least PLUS tier', 'UPGRADE_REQUIRED', 403);
    }
    
    const { data: products, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (error) {
      return errorResponse('Failed to fetch products', 'DB_ERROR', 500);
    }
    
    csvData = arrayToCSV(products || []);
    filename = `export-master-${new Date().toISOString().split('T')[0]}.csv`;
  }

  return new Response(csvData, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${filename}"`
    }
  });
});
