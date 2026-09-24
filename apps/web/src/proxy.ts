/**
 * Guarded Clerk proxy (DEC-023; BB-245 external alpha, D-64). Next 16
 * renamed the middleware convention to proxy; without Clerk keys (local
 * dev) the proxy passes everything through — the API's dev-auth flow
 * covers local work.
 *
 * With keys, the game/player surfaces require a signed-in session:
 * routes are public by default (Clerk CLI note), so each protected
 * prefix calls auth.protect(), which redirects unauthenticated visitors
 * to the Clerk sign-in and resumes the original URL afterwards. Public
 * surfaces (the title/landing, /sign-in, /sign-up) stay open — the
 * landing is the unauthenticated entry path (alpha requirement 2).
 */

import { clerkMiddleware } from '@clerk/nextjs/server';
import { NextFetchEvent, NextResponse, type NextRequest } from 'next/server';

const clerkEnabled = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY);

/** BB-245: the game/player surfaces that require a signed-in session. */
const PROTECTED_PREFIXES = ['/play', '/profile', '/replay', '/review', '/bay'];

const withClerk = clerkMiddleware(async (auth, req) => {
  const pathname = req.nextUrl.pathname;
  const needsAuth = PROTECTED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  if (needsAuth) {
    await auth.protect();
  }
  return NextResponse.next();
});

export async function proxy(request: NextRequest, event?: NextFetchEvent): Promise<Response> {
  if (!clerkEnabled) return NextResponse.next();
  // Clerk's handler requires an event; Next's proxy convention may omit it.
  const fetchEvent = event ?? new NextFetchEvent({ request, page: request.nextUrl.pathname, context: { waitUntil: () => {} } });
  const result = await withClerk(request, fetchEvent);
  return result ?? NextResponse.next();
}

export const config = {
  // Catch-all covers all app routes incl. Clerk's /__clerk/:path* (Clerk
  // setup rule: the __clerk path must run through the proxy — included
  // explicitly for compliance and future matcher changes).
  matcher: ['/((?!_next|.*\\..*).*)', '/__clerk/:path*'],
};
