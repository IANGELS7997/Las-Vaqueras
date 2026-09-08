import { NextResponse } from 'next/server';
import { KITCHEN_COOKIE } from '@/lib/kitchen-auth';

export const runtime = 'nodejs';

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.set(KITCHEN_COOKIE, '', { path: '/', maxAge: 0 });
  return response;
}
