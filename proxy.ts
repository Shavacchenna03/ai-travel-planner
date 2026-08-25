import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { sanitizeCallbackUrl } from "@/lib/security";

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = Boolean(req.auth);

  const isProtectedRoute =
    nextUrl.pathname.startsWith("/plan") ||
    nextUrl.pathname.startsWith("/trips");

  if (isProtectedRoute && !isLoggedIn) {
    const rawCallback = nextUrl.pathname + nextUrl.search;
    const safeCallback = encodeURIComponent(sanitizeCallbackUrl(rawCallback, "/trips"));
    return NextResponse.redirect(new URL(`/auth/signin?callbackUrl=${safeCallback}`, nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/plan/:path*", "/trips/:path*"],
};
