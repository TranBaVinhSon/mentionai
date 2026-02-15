import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Handle @username routes by rewriting to /profile/username
  if (pathname.match(/^\/@[a-zA-Z0-9_-]+$/)) {
    const username = pathname.slice(2); // Remove /@
    const url = request.nextUrl.clone();
    url.pathname = `/profile/${username}`;
    
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.).*)',
  ],
};