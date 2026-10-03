import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

/** Cocina ya no cancela ni reembolsa. El reembolso lo acepta admin. */
export async function POST() {
  return NextResponse.json({ error: 'Cocina no reembolsa pedidos' }, { status: 403 });
}
