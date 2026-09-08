import { NextResponse } from 'next/server';
import { CUSTOMER_COOKIE, customerCookieOptions } from '@/lib/customer-auth';

export const runtime = 'nodejs';

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.set(CUSTOMER_COOKIE, '', { ...customerCookieOptions(), maxAge: 0 });
  return response;
}
