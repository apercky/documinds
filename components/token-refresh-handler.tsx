"use client";

import { AUTH_COMPUTED, AUTH_CONFIG } from "@/lib/auth/config";
import { useLogoutStore } from "@/store/logout";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";
import { SessionExpiryDialog } from "./session-expiry-dialog";

// Routes that require authentication
const PROTECTED_ROUTES = ["/dashboard", "/admin", "/profile", "/settings"];

// Routes where the session expiry dialog should never be shown
const EXCLUDED_ROUTES = ["/", "/login", "/auth"];

// Check if a path is protected (including localized paths)
function isProtectedPath(pathname: string): boolean {
  // Remove locale prefix (e.g., /it/dashboard -> /dashboard)
  const pathWithoutLocale = pathname.replace(/^\/[a-z]{2}\//, "/");

  return PROTECTED_ROUTES.some(
    (route) => pathname.startsWith(route) || pathWithoutLocale.startsWith(route)
  );
}

// Check if a path should never show the session expiry dialog
function isExcludedPath(pathname: string): boolean {
  // Remove locale prefix (e.g., /it/login -> /login)
  const pathWithoutLocale = pathname.replace(/^\/[a-z]{2}\//, "/");

  return EXCLUDED_ROUTES.some(
    (route) =>
      pathname === route ||
      pathWithoutLocale === route ||
      pathname.startsWith(route + "/") ||
      pathWithoutLocale.startsWith(route + "/")
  );
}

function TokenRefreshHandlerCore() {
  const { data: session, update, status } = useSession();
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
  const { isLoggedOut, resetLogoutState } = useLogoutStore();
  const pathname = usePathname();

  // Check if we're on a protected route
  const isProtectedRoute = isProtectedPath(pathname);

  // Check if we're on an excluded route (home, login, etc.)
  const isExcluded = isExcludedPath(pathname);

  // Clear logout state when on non-protected pages to ensure clean state
  useEffect(() => {
    if (!isProtectedRoute) {
      resetLogoutState();
      console.log(
        "🧹 [TokenRefreshHandler] Cleared logout state on non-protected page"
      );
    }
  }, [isProtectedRoute, pathname, resetLogoutState]);

  // Show session expiry dialog only if:
  // 1. On a protected route
  // 2. Not on an excluded route
  // 3. Status is unauthenticated
  // 4. Not during a logout operation
  const showExpiryDialog =
    isProtectedRoute &&
    !isExcluded &&
    status === "unauthenticated" &&
    !isLoggedOut;

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
    "Excluded:",
    isExcluded,
    "IsLoggedOut:",
    isLoggedOut,
    "ShowDialog:",
    showExpiryDialog
  );

  // Only render on protected routes that are not excluded
  if (!isProtectedRoute || isExcluded) {
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
