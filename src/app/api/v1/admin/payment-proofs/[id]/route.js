// POST /api/v1/admin/payment-proofs/[id] — (Superadmin only) Approve atau Reject bukti pembayaran
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { errorResponse, successResponse } from '@/lib/auth-helpers';

export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { action, rejection_reason } = body; // action: 'APPROVE' | 'REJECT'

    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    const adminEmails = (process.env.SUPERADMIN_EMAILS || process.env.ADMIN_EMAIL || '')
      .split(',')
      .map((e) => e.trim().toLowerCase());

    if (!user || !adminEmails.includes(user.email?.toLowerCase())) {
      return errorResponse('Akses ditolak. Hanya Superadmin yang diizinkan.', 'FORBIDDEN', 403);
    }

    // Ambil detail payment proof
    const { data: proof, error: proofErr } = await supabaseAdmin
      .from('payment_proofs')
      .select('*')
      .eq('id', id)
      .single();

    if (proofErr || !proof) {
      return errorResponse('Bukti pembayaran tidak ditemukan.', 'NOT_FOUND', 404);
    }

    if (action === 'APPROVE') {
      // 1. Update status payment_proofs
      const { error: updateProofErr } = await supabaseAdmin
        .from('payment_proofs')
        .update({
          status: 'APPROVED',
          approved_by: user.email,
          approved_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (updateProofErr) throw updateProofErr;

      // 2. Hitung valid_until (30 hari dari sekarang)
      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + 30);

      const rawPlan = (proof.plan_requested || 'MAGANG').trim().toUpperCase();
      let tier = 'SUPERVISOR';
      if (rawPlan === 'EKSEKUTIF' || rawPlan === 'PRO') {
        tier = 'EKSEKUTIF';
      } else if (rawPlan === 'MANAJER' || rawPlan === 'JURAGAN' || rawPlan === 'PLUS') {
        tier = 'MANAJER';
      } else if (rawPlan === 'SUPERVISOR' || rawPlan === 'STARTER' || rawPlan === 'STANDARD') {
        tier = 'SUPERVISOR';
      } else {
        tier = 'MAGANG';
      }

      const maxCashiers = tier === 'EKSEKUTIF' ? 10 : tier === 'MANAJER' ? 5 : 2;
      const maxBranches = tier === 'EKSEKUTIF' ? 3 : 1;

      // 3. Upsert subscription toko sasaran
      await supabaseAdmin
        .from('subscriptions')
        .upsert({
          shop_id: proof.shop_id,
          plan: tier,
          valid_until: validUntil.toISOString(),
          max_cashiers: maxCashiers,
          max_branches: maxBranches,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'shop_id' });

      // 4. Update tabel shops (tier, status ACTIVE, unchokehold)
      await supabaseAdmin
        .from('shops')
        .update({
          subscription_tier: tier,
          operational_status: 'ACTIVE',
          chokehold_active: false,
          cashier_limit: maxCashiers,
        })
        .eq('id', proof.shop_id);

      // 5. Update profile owner
      const { data: ownerShop } = await supabaseAdmin
        .from('shops')
        .select('owner_id')
        .eq('id', proof.shop_id)
        .single();

      if (ownerShop?.owner_id) {
        await supabaseAdmin
          .from('profiles')
          .update({ subscription_plan: tier })
          .eq('id', ownerShop.owner_id);
      }

      // 6. Catat ke Immutable Audit Log
      try {
        await supabaseAdmin
          .from('admin_audit_logs')
          .insert({
            admin_id: user.id,
            admin_email: user.email,
            action_type: 'PAYMENT_PROOF_APPROVED',
            target_shop_id: proof.shop_id,
            reason: `Menyetujui bukti pembayaran untuk upgrade paket ${rawPlan} (Tier: ${tier}).`,
            ip_address: request.headers.get('x-forwarded-for') || '127.0.0.1',
            metadata: { proof_id: id, plan_requested: rawPlan, tier }
          });
      } catch (aErr) {
        console.error('[Audit Log Error]', aErr);
      }

      // 7. Broadcast realtime update ke channel toko sasaran
      try {
        const payloadPlan = {
          event: 'PLAN_UPDATED',
          shop_id: proof.shop_id,
          plan: tier,
          tier: tier,
          operational_status: 'ACTIVE',
          max_cashiers: maxCashiers,
          max_branches: maxBranches,
          timestamp: new Date().toISOString(),
        };

        const payloadChokehold = {
          event: 'CHOKEHOLD_REVOKED',
          shop_id: proof.shop_id,
          tier,
          operational_status: 'ACTIVE',
          timestamp: new Date().toISOString(),
        };

        // Broadcast ke channel standar dan user channel
        const controlChannel = supabaseAdmin.channel(`shop_control:${proof.shop_id}`);
        await controlChannel.send({ type: 'broadcast', event: 'PLAN_UPDATED', payload: payloadPlan });
        await controlChannel.send({ type: 'broadcast', event: 'CHOKEHOLD_REVOKED', payload: payloadChokehold });

        const userChannel = supabaseAdmin.channel(`shop_control_user_${proof.shop_id}`);
        await userChannel.send({ type: 'broadcast', event: 'PLAN_UPDATED', payload: payloadPlan });
        await userChannel.send({ type: 'broadcast', event: 'CHOKEHOLD_REVOKED', payload: payloadChokehold });
      } catch (cErr) {}

      return successResponse({ message: `Berhasil menyetujui paket ${rawPlan} (Tier: ${tier}) untuk toko.` });
    } else if (action === 'REJECT') {
      if (!rejection_reason?.trim()) {
        return errorResponse('Alasan penolakan wajib diisi.', 'VALIDATION_ERROR', 422);
      }

      const { error: rejectErr } = await supabaseAdmin
        .from('payment_proofs')
        .update({
          status: 'REJECTED',
          rejection_reason: rejection_reason.trim(),
          approved_by: user.email,
          approved_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (rejectErr) throw rejectErr;

      // Catat penolakan ke Audit Log
      try {
        await supabaseAdmin
          .from('admin_audit_logs')
          .insert({
            admin_id: user.id,
            admin_email: user.email,
            action_type: 'PAYMENT_PROOF_REJECTED',
            target_shop_id: proof.shop_id,
            reason: `Menolak bukti pembayaran: ${rejection_reason.trim()}`,
            ip_address: request.headers.get('x-forwarded-for') || '127.0.0.1',
            metadata: { proof_id: id, rejection_reason: rejection_reason.trim() }
          });
      } catch (aErr) {
        console.error('[Audit Log Error]', aErr);
      }

      return successResponse({ message: 'Bukti pembayaran berhasil ditolak.' });
    } else {
      return errorResponse('Aksi tidak valid (gunakan APPROVE atau REJECT).', 'VALIDATION_ERROR', 400);
    }
  } catch (error) {
    console.error('[POST /admin/payment-proofs/:id]', error);
    return errorResponse('Gagal memproses persetujuan pembayaran.', 'SERVER_ERROR', 500);
  }
}
