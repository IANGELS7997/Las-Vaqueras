import { NextResponse } from 'next/server';
import { requireKitchenSession } from '@/lib/kitchen-guard';
import { getDirectOrganization } from '@/lib/uber-organizations';

export const runtime = 'nodejs';

/** Solo lectura: sucursal actual (UBER_DIRECT_CUSTOMER_ID). No crea organizaciones. */
export async function GET() {
  const denied = await requireKitchenSession();
  if (denied) return denied;

  try {
    const organization = await getDirectOrganization();
    return NextResponse.json({ organization });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo leer la organización';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
