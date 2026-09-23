import AuthStatus from './auth-status';
import DevLanding from './dev-landing';

/**
 * Landing. In development without Clerk keys, the page becomes the
 * self-explanatory dev-mode entry (PLAY + named test players). In any
 * production build the dev surface is structurally absent and the API
 * refuses dev sign-in, so the bypass cannot leak outside development.
 */
const clerkEnabled = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
const devMode = !clerkEnabled && process.env.NODE_ENV !== 'production';

export default function Home() {
  return (
    <main className="home">
      <header className="home-header">
        <p className="home-kicker">{devMode ? 'Bounty Bay · Development Build' : 'Bounty Bay'}</p>
        <h1>
          Can you get the better deal when neither of you knows the other&rsquo;s limit?
        </h1>
        <p className="home-sub">
          A competitive 1v1 bargaining game. Hidden limits, irreversible concessions,
          individual clocks — and an objective score for the surplus you capture.
        </p>
        {devMode ? <DevLanding /> : <AuthStatus />}
      </header>
    </main>
  );
}
