"use client";

import { useAuthUtils } from "@/hooks/auth/use-auth-utils";
import { AUTH_COMPUTED, AUTH_CONFIG } from "@/lib/auth/config";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";
import { SessionExpiryDialog } from "./session-expiry-dialog";

// Routes that require authentication
const PROTECTED_ROUTES = ["/dashboard", "/admin", "/profile", "/settings"];

// Check if a path is protected (including localized paths)
function isProtectedPath(pathname: string): boolean {
  // Remove locale prefix (e.g., /it/dashboard -> /dashboard)
  const pathWithoutLocale = pathname.replace(/^\/[a-z]{2}\//, "/");

  return PROTECTED_ROUTES.some(
    (route) => pathname.startsWith(route) || pathWithoutLocale.startsWith(route)
  );
}

function TokenRefreshHandlerCore() {
  const { data: session, update, status } = useSession();
  const { logout } = useAuthUtils();
  const lastVisibilityChange = useRef<number>(Date.now());
  const refreshInProgress = useRef<boolean>(false);
  const retryCount = useRef<number>(0);

  const performRefresh = useCallback(
    async (reason: string) => {
      if (refreshInProgress.current) {
        return false;
      }

      refreshInProgress.current = true;

      try {
        await update();
        retryCount.current = 0; // Reset retry count on success
        return true;
      } catch (error) {
        retryCount.current++;

        // Exponential backoff retry for errors
        if (retryCount.current < AUTH_CONFIG.refresh.maxRetries) {
          const delay = AUTH_COMPUTED.getRetryDelay(retryCount.current);
          setTimeout(
            () => performRefresh(`${reason} (retry ${retryCount.current})`),
            delay
          );
        } else {
          retryCount.current = 0; // Reset for next refresh cycle
        }
        return false;
      } finally {
        refreshInProgress.current = false;
      }
    },
    [update]
  );

  // Enhanced visibility change handler
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === "visible") {
        const now = Date.now();
        const timeSinceLastVisible = now - lastVisibilityChange.current;

        // Progressive thresholds based on absence time
        let shouldRefresh = false;
        let reason = "";

        if (timeSinceLastVisible > AUTH_COMPUTED.longAbsenceMs) {
          shouldRefresh = true;
          reason = `Long absence (${Math.round(
            timeSinceLastVisible / 60000
          )} minutes)`;
        } else if (timeSinceLastVisible > AUTH_COMPUTED.mediumAbsenceMs) {
          shouldRefresh = true;
          reason = `Medium absence (${Math.round(
            timeSinceLastVisible / 60000
          )} minutes)`;
        } else if (timeSinceLastVisible > AUTH_COMPUTED.shortAbsenceMs) {
          shouldRefresh = true;
          reason = `Short absence (${Math.round(
            timeSinceLastVisible / 60000
          )} minutes)`;
        }

        if (shouldRefresh) {
          await performRefresh(`User returned - ${reason}`);
        }

        lastVisibilityChange.current = now;
      } else {
        // User is leaving - log for debugging
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleVisibilityChange);
    };
  }, [performRefresh]);

  // Smart preventive refresh with dynamic timing
  useEffect(() => {
    if (!session) return;

    // Get randomized interval from config
    const interval = AUTH_COMPUTED.getRandomizedInterval();

    const timer = setInterval(async () => {
      if (document.visibilityState === "visible") {
        await performRefresh(
          `Preventive refresh (${AUTH_CONFIG.refresh.baseIntervalMinutes}min interval)`
        );
      } else {
      }
    }, interval);

    return () => clearInterval(timer);
  }, [session, performRefresh]);

  return null; // Invisible component
}

export function TokenRefreshHandler() {
  const { data: session, status } = useSession();
  const pathname = usePathname();

  // Check if we're on a protected route
  const isProtectedRoute = isProtectedPath(pathname);

  // Show session expiry dialog if on protected route without session
  const showExpiryDialog = isProtectedRoute && status === "unauthenticated";

  // Debug log to see current state
  console.log(
    "🔍 [TokenRefreshHandler] Pathname:",
    pathname,
    "Status:",
    status,
    "Session:",
    !!session,
    "Protected:",
    isProtectedRoute,
    "ShowDialog:",
    showExpiryDialog
  );

  // Only render on protected routes
  if (!isProtectedRoute) {
    return null;
  }

  // Don't render during initial loading
  if (status === "loading") {
    return null;
  }

  return (
    <>
      <TokenRefreshHandlerCore />
      <SessionExpiryDialog open={showExpiryDialog} />
    </>
  );
}
