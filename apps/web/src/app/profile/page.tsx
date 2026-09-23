/**
 * Protected profile page (middleware redirects signed-out users to /sign-in).
 *
 * The server component guards on the Clerk env flag so the prerender never
 * renders Clerk hooks without a provider; the client component demonstrates
 * the end-to-end auth flow: Clerk session token → API adapter verification →
 * internal user → 08_API_CONTRACTS profile shape.
 */

import ProfileClient from './profile-client';

const clerkEnabled = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

export default function ProfilePage() {
  if (!clerkEnabled) {
    return (
      <main className="home">
        <p>Authentication is not configured in this environment. Local development uses the API dev sign-in.</p>
      </main>
    );
  }
  return (
    <main className="home">
      <ProfileClient />
    </main>
  );
}
