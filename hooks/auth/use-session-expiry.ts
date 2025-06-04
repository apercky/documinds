"use client";

import { useSessionExpiryStore } from "@/store/session-expiry";
import { useSession } from "next-auth/react";
import { useEffect } from "react";

export function useSessionExpiry() {
  const { data: session } = useSession();
  const { showExpiryDialog, resetErrors } = useSessionExpiryStore();

  // Reset contatori quando la sessione cambia
  useEffect(() => {
    if (session) {
      resetErrors();
    }
  }, [session, resetErrors]);

  return {
    showExpiryDialog,
  };
}
