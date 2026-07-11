import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // httpOnly session cookies set by the BFF (/api/auth/*, /api/proxy). Either an
  // access or a still-valid refresh cookie counts as a session; the proxy will
  // refresh an expired access token on the next authenticated call.
  const hasToken =
    request.cookies.has('md_vendor_access') || request.cookies.has('md_vendor_refresh');

  // If user is not logged in and not on the login/signup pages, Auth callback, or an invite link
  if (
    !hasToken &&
    !request.nextUrl.pathname.startsWith('/login') &&
    !request.nextUrl.pathname.startsWith('/signup') &&
    !request.nextUrl.pathname.startsWith('/auth') &&
    !request.nextUrl.pathname.startsWith('/accept-invite')
  ) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // If user is logged in and trying to access the login or signup page
  if (
    hasToken &&
    (request.nextUrl.pathname.startsWith('/login') || request.nextUrl.pathname.startsWith('/signup'))
  ) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|manifest.json|sw.js|icon|offline).*)'],
};
