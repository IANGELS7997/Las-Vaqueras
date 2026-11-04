import { NextResponse } from 'next/server';
import { commitHandoffPin } from '@/lib/handoff-pin';
import { requireKitchenBranch } from '@/lib/kitchen-guard';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const branch = await requireKitchenBranch();
  if (branch instanceof NextResponse) return branch;

  const body = (await req.json().catch(() => ({}))) as { pin?: string };
  const result = await commitHandoffPin({
    orderId: params.id,
    pin: String(body.pin || ''),
    source: 'kitchen',
    branchId: branch,
  });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true, pin: result.pin, order: result.order });
}
