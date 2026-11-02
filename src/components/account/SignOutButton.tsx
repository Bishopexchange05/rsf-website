"use client";

import { PendingButton } from "@/components/PendingButton";
import { accountNav } from "@/content/accounts";
import { signOutAction } from "@/lib/auth-actions";

// Log out from anywhere. Also forgets the header's remembered "signed in" answer for this
// tab, so the header shows "Log in" straight away on the next page.
export function SignOutButton({ className }: { className?: string }) {
  return (
    <form
      action={signOutAction}
      onSubmit={() => {
        try {
          sessionStorage.removeItem("rsf:me");
        } catch {
          // storage blocked: the header asks the server again anyway
        }
      }}
    >
      <PendingButton pendingText={accountNav.signingOut} className={className}>
        {accountNav.signOut}
      </PendingButton>
    </form>
  );
}
