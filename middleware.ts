import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_ROUTES = ['/portal', '/login'];
const PUBLIC_PREFIXES = ['/portal'];
const PUBLIC_FILES = [
  '/favicon.ico',
  '/st-benedicts-logo.png',
];

function isPublicRoute(pathname: string) {
  if (PUBLIC_ROUTES.includes(pathname)) return true;
  return PUBLIC_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function isPublicAsset(pathname: string) {
  if (PUBLIC_FILES.includes(pathname)) return true;

  return (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/images') ||
    pathname.startsWith('/icons') ||
    pathname.startsWith('/public') ||
    pathname.match(/\.(png|jpg|jpeg|gif|webp|svg|ico|css|js|map|txt|woff|woff2|ttf)$/) !== null
  );
}

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (isPublicAsset(pathname)) {
    return NextResponse.next();
  }

  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  const coachAccess = request.cookies.get('coach_access')?.value;

  if (coachAccess === 'granted') {
    return NextResponse.next();
  }

  const loginUrl = new URL('/login', request.url);
  const redirectTo = `${pathname}${search || ''}`;
  loginUrl.searchParams.set('redirect', redirectTo);

  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};