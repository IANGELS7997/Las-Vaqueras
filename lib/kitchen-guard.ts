import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { isValidKitchenSession, KITCHEN_COOKIE } from '@/lib/kitchen-auth';

export async function requireKitchenSession() {
  const value = cookies().get(KITCHEN_COOKIE)?.value;
  if (await isValidKitchenSession(value)) return null;
  return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
}
