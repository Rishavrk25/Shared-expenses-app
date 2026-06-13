import { useUser } from "@clerk/clerk-react";

function Profile() {
  const { user } = useUser();

  return (
    <div>
      {user?.firstName}
      {user?.primaryEmailAddress?.emailAddress}
    </div>
  );
}