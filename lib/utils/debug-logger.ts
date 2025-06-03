/**
 * Debug logger utility for conditional logging based on environment variables
 * Set AUTH_DEBUG=true in .env.local to enable these logs
 */

/**
 * Log to console.log only if AUTH_DEBUG is enabled
 * @param message The message to log
 * @param args Additional arguments to log
 */
export const debugLog = (message: string, ...args: any[]) => {
  // Only log if AUTH_DEBUG is enabled in environment
  if (process.env.AUTH_DEBUG === "true") {
    console.log(`[AUTH_DEBUG] ${message}`, ...args);
  }
};

/**
 * Log critical messages to stderr that should always appear regardless of debug setting
 * Use for important errors, security events, or system status changes
 * @param message The message to log
 * @param args Additional arguments to log
 */
export const debugStderr = (message: string, ...args: any[]) => {
  // Always log critical messages in development
  if (process.env.NODE_ENV === "development") {
    console.error(`[AUTH_CRITICAL] ${message}`, ...args);
  }
};

/**
 * Check if debug mode is enabled
 * @returns true if AUTH_DEBUG is set to "true"
 */
export const isDebugEnabled = () => {
  return process.env.AUTH_DEBUG === "true";
};
