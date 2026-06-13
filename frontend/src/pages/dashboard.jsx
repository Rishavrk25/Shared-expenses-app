import { SignedIn, SignedOut } from "@clerk/clerk-react";

export function Dashboard() {
  return (
    <>
      <SignedIn>
        <h1>Dashboard</h1>
      </SignedIn>

      <SignedOut>
        <h1>Please Login</h1>
      </SignedOut>
    </>
  );
}
