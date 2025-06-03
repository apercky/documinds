/**
 * Authentication Configuration
 * Centralized configuration for all authentication timing and retry logic
 * All values can be overridden via environment variables
 */

// Helper function to parse env vars with defaults
const parseEnvNumber = (
  envVar: string | undefined,
  defaultValue: number
): number => {
  if (!envVar) return defaultValue;
  const parsed = parseInt(envVar, 10);
  return isNaN(parsed) ? defaultValue : parsed;
};

const parseEnvBoolean = (
  envVar: string | undefined,
  defaultValue: boolean
): boolean => {
  if (!envVar) return defaultValue;
  return envVar.toLowerCase() === "true";
};

export const AUTH_CONFIG = {
  // Token Management
  tokens: {
    // JWT refresh threshold (seconds before expiry)
    refreshThresholdSeconds: parseEnvNumber(
      process.env.AUTH_TOKEN_REFRESH_THRESHOLD,
      120
    ),

    // Default token expiry if not provided by Keycloak (seconds)
    defaultExpirySeconds: parseEnvNumber(
      process.env.AUTH_TOKEN_DEFAULT_EXPIRY,
      3600
    ),

    // Redis TTL extra time beyond token expiry (seconds)
    redisTtlExtraSeconds: parseEnvNumber(
      process.env.AUTH_REDIS_TTL_EXTRA,
      7200
    ),
  },

  // NextAuth Session Configuration
  session: {
    // Session max age (seconds) - should match Keycloak SSO settings
    maxAgeSeconds: parseEnvNumber(process.env.AUTH_SESSION_MAX_AGE, 1800), // 30 minutes
  },

  // Redis Lock Management
  lock: {
    // Lock timeout for token refresh operations (seconds)
    timeoutSeconds: parseEnvNumber(process.env.AUTH_LOCK_TIMEOUT, 30),

    // Maximum wait time for lock acquisition (seconds)
    maxWaitSeconds: parseEnvNumber(process.env.AUTH_LOCK_MAX_WAIT, 25),

    // Wait interval when checking for lock release (milliseconds)
    waitIntervalMs: parseEnvNumber(process.env.AUTH_LOCK_WAIT_INTERVAL, 1000),
  },

  // Proactive Refresh Configuration
  refresh: {
    // Base interval for preventive refresh (minutes)
    baseIntervalMinutes: parseEnvNumber(process.env.AUTH_REFRESH_INTERVAL, 4),

    // Random offset to prevent thundering herd (seconds)
    randomOffsetSeconds: parseEnvNumber(
      process.env.AUTH_REFRESH_RANDOM_OFFSET,
      30
    ),

    // Retry configuration
    maxRetries: parseEnvNumber(process.env.AUTH_REFRESH_MAX_RETRIES, 3),

    // Base delay for exponential backoff (milliseconds)
    baseRetryDelayMs: parseEnvNumber(process.env.AUTH_REFRESH_BASE_DELAY, 1000),
  },

  // User Return Detection (Visibility API)
  visibility: {
    // Thresholds for different absence durations (minutes)
    shortAbsenceMinutes: parseEnvNumber(
      process.env.AUTH_SHORT_ABSENCE_THRESHOLD,
      2
    ),
    mediumAbsenceMinutes: parseEnvNumber(
      process.env.AUTH_MEDIUM_ABSENCE_THRESHOLD,
      4
    ),
    longAbsenceMinutes: parseEnvNumber(
      process.env.AUTH_LONG_ABSENCE_THRESHOLD,
      10
    ),
  },

  // React Query Configuration
  query: {
    // How long data stays fresh (minutes)
    staleTimeMinutes: parseEnvNumber(process.env.AUTH_QUERY_STALE_TIME, 1),

    // Garbage collection time (minutes)
    gcTimeMinutes: parseEnvNumber(process.env.AUTH_QUERY_GC_TIME, 3),

    // Maximum retry attempts for API calls
    maxRetries: parseEnvNumber(process.env.AUTH_QUERY_MAX_RETRIES, 2),

    // Maximum retry delay (milliseconds)
    maxRetryDelayMs: parseEnvNumber(
      process.env.AUTH_QUERY_MAX_RETRY_DELAY,
      30000
    ),
  },

  // Development & Debugging
  debug: {
    // Enable detailed authentication logs
    enabled: parseEnvBoolean(process.env.AUTH_DEBUG, false),

    // Log token details (first N characters)
    tokenLogLength: parseEnvNumber(process.env.AUTH_DEBUG_TOKEN_LENGTH, 20),
  },
} as const;

// Computed values for convenience
export const AUTH_COMPUTED = {
  // Convert minutes to milliseconds
  refreshIntervalMs: AUTH_CONFIG.refresh.baseIntervalMinutes * 60 * 1000,
  randomOffsetMs: AUTH_CONFIG.refresh.randomOffsetSeconds * 1000,

  // Visibility thresholds in milliseconds
  shortAbsenceMs: AUTH_CONFIG.visibility.shortAbsenceMinutes * 60 * 1000,
  mediumAbsenceMs: AUTH_CONFIG.visibility.mediumAbsenceMinutes * 60 * 1000,
  longAbsenceMs: AUTH_CONFIG.visibility.longAbsenceMinutes * 60 * 1000,

  // Query times in milliseconds
  staleTimeMs: AUTH_CONFIG.query.staleTimeMinutes * 60 * 1000,
  gcTimeMs: AUTH_CONFIG.query.gcTimeMinutes * 60 * 1000,

  // Retry delay calculator
  getRetryDelay: (attemptIndex: number): number => {
    const delay =
      AUTH_CONFIG.refresh.baseRetryDelayMs * Math.pow(2, attemptIndex);
    return Math.min(delay, AUTH_CONFIG.query.maxRetryDelayMs);
  },

  // Random interval calculator for preventive refresh
  getRandomizedInterval: (): number => {
    const randomOffset = (Math.random() - 0.5) * AUTH_COMPUTED.randomOffsetMs;
    return AUTH_COMPUTED.refreshIntervalMs + randomOffset;
  },
} as const;

// Type exports for better TypeScript support
export type AuthConfig = typeof AUTH_CONFIG;
export type AuthComputed = typeof AUTH_COMPUTED;
