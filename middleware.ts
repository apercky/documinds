import { routing } from "@/app/i18n/routing";
import { locales } from "@/config/locales";
import { auth } from "@/lib/auth";
import createIntlMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";

const intlMiddleware = createIntlMiddleware(routing);

// Simple array of routes to protect (without locale prefix)
const routesToProtect = ["/dashboard", "/admin"];

export const config = {
  matcher: [
    "/",
    "/(it|en)/:path*",
    // 👇 routes protected (important for next-auth)
    "/api/auth/:path*",
  ],
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip internationalization middleware for API routes
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // Check if the current path is a protected route by extracting the locale and path
  const patternWithLocale = new RegExp(`^/(${locales.join("|")})(/.*)$`);
  const matchWithLocale = pathname.match(patternWithLocale);

  if (matchWithLocale) {
    const [, locale, path] = matchWithLocale;

    // Check if the path (without locale) is in our protected routes
    const isProtectedRoute = routesToProtect.some((route) =>
      path.startsWith(route)
    );

    if (isProtectedRoute) {
      console.log(`Protected route detected: ${pathname}`);

      // We retrieve the session from the auth function
      const session = await auth();
      console.log(
        `Session state: ${session ? "authenticated" : "unauthenticated"}`
      );

      if (!session) {
        console.log(`No session, redirecting to sign in`);

        // Use absolute URL for the auth endpoint to avoid locale prefixing
        const origin = new URL(request.url).origin;
        const authUrl = `${origin}/api/auth/signin`;
        const redirectUrl = `${authUrl}?callbackUrl=${encodeURIComponent(
          request.url
        )}`;

        console.log(`Redirecting to: ${redirectUrl}`);
        return NextResponse.redirect(redirectUrl);
      }
    }
  }

  // Apply internationalization middleware for all non-API routes
  return intlMiddleware(request);
}
