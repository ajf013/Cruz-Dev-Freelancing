import { NextResponse } from "next/server";

export function proxy(request) {
  const { pathname } = request.nextUrl;
  const adminPath = process.env.ADMIN_PATH;

  // Normalize path by removing trailing slash (except for root "/")
  const cleanPath = pathname.endsWith("/") && pathname !== "/" ? pathname.slice(0, -1) : pathname;

  // Only apply custom routing logic if ADMIN_PATH is configured and is not "/admin"
  if (adminPath && adminPath !== "/admin") {
    // 1. Block direct public access to "/admin"
    if (cleanPath === "/admin" || cleanPath.startsWith("/admin/")) {
      return new NextResponse("Not Found", { status: 404 });
    }

    // 2. Rewrite the secret path to the internal admin page
    if (cleanPath === adminPath) {
      return NextResponse.rewrite(new URL("/admin", request.url));
    }
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
     * - favicon.ico, logo.png, etc. (static public assets)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|logo.png|manifest.json|sw.js|icon-).*)",
  ],
};
