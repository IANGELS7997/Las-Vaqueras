import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { BranchId } from '@/lib/branches';
import { KITCHEN_COOKIE, readKitchenBranch } from '@/lib/kitchen-auth';

export async function requireKitchenSession() {
  const branch = await readKitchenBranch(cookies().get(KITCHEN_COOKIE)?.value);
  if (branch) return null;
  return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
}

export async function requireKitchenBranch(): Promise<BranchId | NextResponse> {
  const branch = await readKitchenBranch(cookies().get(KITCHEN_COOKIE)?.value);
  if (branch) return branch;
  return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
}
