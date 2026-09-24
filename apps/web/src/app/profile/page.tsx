/**
 * Protected profile page (middleware redirects signed-out users to /sign-in).
 *
 * The server component guards on the Clerk env flag so the prerender never
 * renders Clerk hooks without a provider; the client component demonstrates
 * the end-to-end auth flow. Dev builds render the dev identity's standing
 * with the hub bar (CTA_ROUTE_CONTRACT: ME is always a working surface).
 */

import ProfileClient from './profile-client';
import DevProfile from './dev-profile';
import './../../components/hub/hub.css';

const clerkEnabled = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

export default function ProfilePage() {
  if (!clerkEnabled) {
    return <DevProfile />;
  }
  return (
    <main className="home">
      <ProfileClient />
    </main>
  );
}
