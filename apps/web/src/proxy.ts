/**
 * Guarded Clerk proxy (DEC-023). Next 16 renamed the middleware convention
 * to proxy; without Clerk keys (local dev) the proxy passes everything
 * through — the API's dev-auth flow covers local work. With keys, /profile
 * requires a signed-in session.
 */

import { clerkMiddleware } from '@clerk/nextjs/server';
import { NextFetchEvent, NextResponse, type NextRequest } from 'next/server';

const clerkEnabled = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY);

const withClerk = clerkMiddleware(async (auth, req) => {
  const { userId } = await auth();
  if (!userId && req.nextUrl.pathname.startsWith('/profile')) {
    const signIn = new URL('/sign-in', req.url);
    return NextResponse.redirect(signIn);
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
