import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {
  hostnameOf,
  isKitchenHostname,
  isLocalHostname,
  isValidKitchenSession,
  KITCHEN_COOKIE,
} from '@/lib/kitchen-auth';

function isPublicAsset(pathname: string) {
  return (
    pathname.startsWith('/_next') ||
    pathname === '/favicon.ico' ||
    /\.(?:svg|png|jpg|jpeg|gif|webp|ico|wav|mp3|ogg)$/i.test(pathname)
  );
}

function isKitchenAppPath(pathname: string) {
  return (
    pathname.startsWith('/admin') ||
    pathname.startsWith('/api/kitchen') ||
    pathname === '/api/refund' ||
    pathname.startsWith('/api/products/availability') ||
    /^\/api\/orders\/[^/]+\/status$/.test(pathname)
  );
}

function isKitchenAuthPath(pathname: string) {
  return pathname === '/admin/login' || pathname === '/api/kitchen/login';
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (isPublicAsset(pathname)) return NextResponse.next();

  const host = hostnameOf(request.headers.get('host'));
  const onKitchenHost = isKitchenHostname(host);
  const onLocal = isLocalHostname(host);
  const hasSession = await isValidKitchenSession(request.cookies.get(KITCHEN_COOKIE)?.value);

  if (onKitchenHost) {
    if (pathname === '/') {
      const url = request.nextUrl.clone();
      url.pathname = hasSession ? '/admin/kitchen' : '/admin/login';
      return NextResponse.rewrite(url);
    }

    if (!isKitchenAppPath(pathname)) {
      return NextResponse.redirect(new URL('/admin/kitchen', request.url));
    }

    if (isKitchenAuthPath(pathname)) return NextResponse.next();
    if (!hasSession) return NextResponse.redirect(new URL('/admin/login', request.url));
    return NextResponse.next();
  }

  if (isKitchenAppPath(pathname)) {
    if (!onLocal) {
      return new NextResponse('Not Found', { status: 404 });
    }
    if (isKitchenAuthPath(pathname)) return NextResponse.next();
    if (!hasSession) return NextResponse.redirect(new URL('/admin/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
};
