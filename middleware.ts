import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {
  hostnameOf,
  isKitchenHostname,
  isLocalHostname,
  KITCHEN_COOKIE,
  readKitchenSession,
  sessionGenerationMatches,
  storedSessionGeneration,
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
    pathname === '/api/uber/organization' ||
    pathname.startsWith('/api/products/availability') ||
    /^\/api\/orders\/[^/]+\/status$/.test(pathname)
  );
}

function isKitchenAuthPath(pathname: string) {
  return pathname === '/admin/login' || pathname === '/api/kitchen/login';
}

function denyKitchen(request: NextRequest, pathname: string) {
  if (pathname.startsWith('/api/kitchen') && !isKitchenAuthPath(pathname)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  return NextResponse.redirect(new URL('/admin/login', request.url));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (isPublicAsset(pathname)) return NextResponse.next();

  const host = hostnameOf(request.headers.get('host'));
  const onKitchenHost = isKitchenHostname(host);
  const onLocal = isLocalHostname(host);
  const session = await readKitchenSession(request.cookies.get(KITCHEN_COOKIE)?.value);
  let hasSession = session != null;
  if (onKitchenHost && session) {
    const stored = await storedSessionGeneration(session.branch);
    if (!sessionGenerationMatches(session.generation, stored)) hasSession = false;
  }

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
    if (!hasSession) return denyKitchen(request, pathname);
    return NextResponse.next();
  }

  if (isKitchenAppPath(pathname)) {
    if (!onLocal) {
      return new NextResponse('Not Found', { status: 404 });
    }
    if (isKitchenAuthPath(pathname)) return NextResponse.next();
    if (!hasSession) return denyKitchen(request, pathname);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
};
