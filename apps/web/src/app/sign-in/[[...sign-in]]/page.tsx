import { SignIn } from '@clerk/nextjs';

const clerkEnabled = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

export default function SignInPage() {
  if (!clerkEnabled) {
    return (
      <main className="home">
        <p>Authentication is not configured in this environment. Local development uses the API dev sign-in.</p>
      </main>
    );
  }
  return (
    <main className="home">
      <SignIn />
    </main>
  );
}
