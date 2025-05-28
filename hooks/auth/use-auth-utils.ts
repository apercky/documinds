"use client";

import { useQueryClient } from "@tanstack/react-query";
import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
/**
 * Hook that provides utilities for managing authentication
 * and user-related caches
 */
export function useAuthUtils() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { data: session } = useSession();

  /**
   * Performs logout and cleans all user caches
   * @param redirectTo Optional URL for redirect after logout
   */
  const logout = async () => {
    console.log(`[NextAuth session]: ${JSON.stringify(session, null, 2)}`);

    const origin = typeof window !== "undefined" ? window.location.origin : "";
    // Create logout url to logout from the OIDC provider
    const idToken = (session as any).idToken;
    const oidcIssuer = (session as any).oidcIssuer;
    const logoutEndpoint = `${oidcIssuer}/protocol/openid-connect/logout`;
    const logoutUrl = `${logoutEndpoint}?id_token_hint=${idToken}&post_logout_redirect_uri=${encodeURIComponent(
      origin
    )}`;

    console.log(`[NextAuth logoutUrl]: ${logoutUrl}\n`);

    // Clears the session and invalidates all queries with userData or those protected by auth
    await clearSession();

    // With NextAuth automatic redirect
    await signOut({
      redirect: false,
    });

    if (idToken) {
      // Redirect to the logout url
      window.location.replace(logoutUrl);
    } else {
      // Redirect to home page or login page
      router.push("/");
      // Force a page refresh to completely clean the state
      router.refresh();
    }
  };

  /**
   * Clears the session and invalidates all queries with userData or those protected by auth
   */
  const clearSession = async () => {
    // First invalidate all queries with userData or those protected by auth
    queryClient.invalidateQueries({ queryKey: ["userData"] });

    // Completely remove data from cache to avoid stale data
    queryClient.removeQueries({ queryKey: ["userData"] });

    // Call server-side API to clean the user's Redis cache
    await fetch("/api/auth/signout-redis", { method: "POST" });
  };

  /**
   * Reloads user data, forces a refresh from the network
   */
  const refreshUserData = () => {
    queryClient.invalidateQueries({ queryKey: ["userData"] });
  };

  return {
    logout,
    refreshUserData,
  };
}
