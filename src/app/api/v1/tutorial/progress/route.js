import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    ok: true,
    data: {
      tutorial_id: 'default',
      tutorial_status: 'completed',
      onboarding_completed: true,
      onboarding_last_step: 8,
    }
  });
}

export async function PUT(request) {
  const body = await request.json().catch(() => ({}));
  return NextResponse.json({
    ok: true,
    data: {
      onboarding_completed: true,
      ...body,
    }
  });
}
