"use client";

import { debugLog } from "@/lib/utils/debug-logger";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useRef } from "react";

export function TokenRefreshHandler() {
  const { data: session, update } = useSession();
  const lastVisibilityChange = useRef<number>(Date.now());
  const refreshInProgress = useRef<boolean>(false);
  const retryCount = useRef<number>(0);
  const maxRetries = 3;

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
          `❌ Refresh failed (attempt ${retryCount.current}/${maxRetries}): ${reason}`,
          error
        );

        // Exponential backoff retry for critical errors
        if (retryCount.current < maxRetries) {
          const delay = Math.pow(2, retryCount.current) * 1000; // 2s, 4s, 8s
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

        if (timeSinceLastVisible > 10 * 60 * 1000) {
          // 10+ minutes
          shouldRefresh = true;
          reason = `Long absence (${Math.round(
            timeSinceLastVisible / 60000
          )} minutes)`;
        } else if (timeSinceLastVisible > 4 * 60 * 1000) {
          // 4+ minutes
          shouldRefresh = true;
          reason = `Medium absence (${Math.round(
            timeSinceLastVisible / 60000
          )} minutes)`;
        } else if (timeSinceLastVisible > 2 * 60 * 1000) {
          // 2+ minutes
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

    // Slightly randomized interval (3.5-4.5 minutes) to prevent thundering herd
    const baseInterval = 4 * 60 * 1000; // 4 minutes
    const randomOffset = (Math.random() - 0.5) * 60 * 1000; // ±30 seconds
    const interval = baseInterval + randomOffset;

    debugLog(
      `⏰ Setting up preventive refresh every ${Math.round(interval / 1000)}s`
    );

    const timer = setInterval(async () => {
      if (document.visibilityState === "visible") {
        await performRefresh("Preventive refresh (4min interval)");
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
