import type { Metadata } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import { Baloo_2, Space_Grotesk, Inter } from 'next/font/google';
import './globals.css';
import ErrorCatcher from '../components/error-catcher';

export const metadata: Metadata = {
  title: 'Bounty Bay',
  description: 'Can you get the better deal when neither of you knows the other’s limit?',
};

// Claude Design canvas v1 (DEC-029, docs/21): world face carries game
// personality; numerals stay Space Grotesk; Inter carries UI legibility.
// Self-hosted via next/font (docs/09) — no runtime font CDNs.
const world = Baloo_2({ subsets: ['latin'], weight: ['600', '700', '800'], variable: '--font-world' });
const numerals = Space_Grotesk({ subsets: ['latin'], weight: ['500', '600', '700'], variable: '--font-num' });
const ui = Inter({ subsets: ['latin'], weight: ['400', '500', '600', '700', '800'], variable: '--font-ui' });

// Guarded: without a publishable key (local dev), skip the provider entirely
// rather than crash; the API dev-auth flow covers local work (DEC-023).
const clerkEnabled = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${world.variable} ${numerals.variable} ${ui.variable}`}>
        {!clerkEnabled && (
          <p className="dev-banner" role="status">
            Auth not configured — running without Clerk. API dev sign-in is available at /v1/auth/dev/signin.
          </p>
        )}
        {clerkEnabled ? (
          <ClerkProvider>
            <ErrorCatcher />
            {children}
          </ClerkProvider>
        ) : (
          <>
            <ErrorCatcher />
            {children}
          </>
        )}
      </body>
    </html>
  );
}
