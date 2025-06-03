"use client";

import { AUTH_COMPUTED, AUTH_CONFIG } from "@/lib/auth/config";
import { debugLog } from "@/lib/utils/debug-logger";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useRef } from "react";

export function TokenRefreshHandler() {
  const { data: session, update } = useSession();
  const lastVisibilityChange = useRef<number>(Date.now());
  const refreshInProgress = useRef<boolean>(false);
  const retryCount = useRef<number>(0);

  const performRefresh = useCallback(
    async (reason: string) => {
      if (refreshInProgress.current) {
        debugLog(`🔒 Refresh already in progress, skipping ${reason}`);
        return false;
      }

      refreshInProgress.current = true;
      debugLog(`🔄 Starting refresh: ${reason}`);

      try {
        await update();
        debugLog(`✅ Refresh successful: ${reason}`);
        retryCount.current = 0; // Reset retry count on success
        return true;
      } catch (error) {
        retryCount.current++;
        debugLog(
          `❌ Refresh failed (attempt ${retryCount.current}/${AUTH_CONFIG.refresh.maxRetries}): ${reason}`,
          error
        );

        // Exponential backoff retry for critical errors
        if (retryCount.current < AUTH_CONFIG.refresh.maxRetries) {
          const delay = AUTH_COMPUTED.getRetryDelay(retryCount.current);
          debugLog(`⏰ Retrying in ${delay}ms...`);
          setTimeout(
            () => performRefresh(`${reason} (retry ${retryCount.current})`),
            delay
          );
        } else {
          debugLog(`💥 Max retries exceeded for: ${reason}`);
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
        debugLog(`👋 User left at ${new Date().toISOString()}`);
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

    debugLog(
      `⏰ Setting up preventive refresh every ${Math.round(interval / 1000)}s`
    );

    const timer = setInterval(async () => {
      if (document.visibilityState === "visible") {
        await performRefresh(
          `Preventive refresh (${AUTH_CONFIG.refresh.baseIntervalMinutes}min interval)`
        );
      } else {
        debugLog(`⏸️ Skipping preventive refresh - page not visible`);
      }
    }, interval);

    return () => clearInterval(timer);
  }, [session, performRefresh]);

  // Emergency refresh trigger on critical API failures (hook for other components)
  useEffect(() => {
    const handleEmergencyRefresh = async () => {
      debugLog(`🚨 Emergency refresh triggered by API failure`);
      await performRefresh("Emergency refresh (API 401)");
    };

    // Listen for custom event from API interceptors
    window.addEventListener("token-emergency-refresh", handleEmergencyRefresh);

    return () => {
      window.removeEventListener(
        "token-emergency-refresh",
        handleEmergencyRefresh
      );
    };
  }, [performRefresh]);

  return null; // Invisible component
}
