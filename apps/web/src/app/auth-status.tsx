'use client';

/**
 * Signed-in/signed-out state on the landing page. Renders nothing while
 * Clerk is unconfigured (dev mode).
 */

import { SignInButton, SignedIn, SignedOut, UserButton } from '@clerk/nextjs';

const clerkEnabled = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

export default function AuthStatus() {
  if (!clerkEnabled) return null;
  return (
    <div className="auth-status">
      <SignedOut>
        <SignInButton mode="modal">
          <button type="button" className="play-button">
            Sign in to play
          </button>
        </SignInButton>
      </SignedOut>
      <SignedIn>
        <a className="home-sub" href="/profile">
          Your profile
        </a>
        <a className="play-button" href="/play">
          Play
        </a>
        <UserButton />
      </SignedIn>
    </div>
  );
}
