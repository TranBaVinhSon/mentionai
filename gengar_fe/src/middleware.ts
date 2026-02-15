import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

// List of public routes that don't require authentication
const PUBLIC_ROUTES = [
  "/",
  "/pricing",
  "/commerce-disclosure",
  "/terms-of-service",
  "/privacy",
  "/features",
  "/explore",
  "/community",
  "/models",
  "/use-cases",
  "/signin",
];

const isPublicRoute = (pathname: string): boolean => {
  // Check exact matches
  if (PUBLIC_ROUTES.includes(pathname)) {
    return true;
  }
  
  // Check pattern matches
  if (
    pathname.startsWith("/shared/c/") || // Shared conversations
    pathname.startsWith("/tools") || // Tools pages
    pathname.match(/^\/@[^\/]+$/) // User profiles (e.g., /@username)
  ) {
    return true;
  }
  
  return false;
};

export default auth((req) => {
  const { pathname } = req.nextUrl;
  
  // Clone the request headers
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-pathname", pathname);
  
  // Check if user is authenticated
  const isAuthenticated = !!req.auth;
  
  // If trying to access a private route without authentication, redirect to home
  if (!isAuthenticated && !isPublicRoute(pathname)) {
    return NextResponse.redirect(new URL("/", req.url));
  }
  
  // Otherwise, proceed with the request
  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
});

// いくつかのパスではmiddlewareを動作させない
// macherは、以下で始まるものを除くすべてのリクエスト・パスにマッチする：
// - api (APIルート)
// - _next/static (静的ファイル)
// - _next/image (画像最適化ファイル)
// - favicon.ico (ファビコンファイル)
// - tools (ツールページ)
// - datasets (データセットページ)
// - icons (アイコンファイル)
export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|tools|datasets|icons|images|avatars|.*opengraph-image).*)",
  ],
};
