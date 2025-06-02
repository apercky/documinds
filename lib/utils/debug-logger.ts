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
 * Log to stderr only if AUTH_DEBUG is enabled
 * Useful for NextAuth's logging which uses stderr
 * @param message The message to log
 */
export const debugStderr = (message: string) => {
  if (process.env.AUTH_DEBUG === "true") {
    process.stderr.write(`[AUTH_DEBUG] ${message}\n`);
  }
};

/**
 * Check if debug mode is enabled
 * @returns true if AUTH_DEBUG is set to "true"
 */
export const isDebugEnabled = () => {
  return process.env.AUTH_DEBUG === "true";
};
