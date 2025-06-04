# Authentication Configuration & Debug System

## Overview

The authentication system uses a centralized configuration system that supports environment variables for all timing and behavior parameters, plus a debug logging utility for controlled log output.

## Configuration Variables

### Environment Variables (.env.local)

#### Core Authentication Settings

```bash
# Basic Configuration
AUTH_DEBUG=true                           # Enable detailed debug logs (default: false)
AUTH_SESSION_MAX_AGE=1800                 # NextAuth session duration in seconds (default: 1800 = 30min)

# Token Management
AUTH_TOKEN_REFRESH_THRESHOLD=120          # Refresh token N seconds before expiry (default: 120 = 2min)
AUTH_TOKEN_DEFAULT_EXPIRY=3600            # Default token expiry if Keycloak doesn't specify (default: 3600 = 1hr)
AUTH_REDIS_TTL_EXTRA=7200                 # Extra Redis TTL beyond token expiry (default: 7200 = 2hr)

# Proactive Refresh Timing
AUTH_REFRESH_INTERVAL=4                   # Preventive refresh interval in minutes (default: 4)
AUTH_REFRESH_RANDOM_OFFSET=30             # Random offset in seconds to prevent thundering herd (default: 30)
AUTH_REFRESH_MAX_RETRIES=3                # Max retry attempts for failed refresh (default: 3)
AUTH_REFRESH_BASE_DELAY=1000              # Base delay for exponential backoff in ms (default: 1000)

# User Return Detection (Visibility API)
AUTH_SHORT_ABSENCE_THRESHOLD=2            # Short absence threshold in minutes (default: 2)
AUTH_MEDIUM_ABSENCE_THRESHOLD=4           # Medium absence threshold in minutes (default: 4)
AUTH_LONG_ABSENCE_THRESHOLD=10            # Long absence threshold in minutes (default: 10)

# Redis Lock Configuration
AUTH_LOCK_TIMEOUT=30                      # Lock timeout for refresh operations in seconds (default: 30)
AUTH_LOCK_MAX_WAIT=25                     # Max wait time for lock acquisition in seconds (default: 25)
AUTH_LOCK_WAIT_INTERVAL=1000              # Wait interval when checking lock in ms (default: 1000)

# React Query Settings
AUTH_QUERY_STALE_TIME=1                   # Data staleness time in minutes (default: 1)
AUTH_QUERY_GC_TIME=3                      # Garbage collection time in minutes (default: 3)
AUTH_QUERY_MAX_RETRIES=2                  # Max API retry attempts (default: 2)
AUTH_QUERY_MAX_RETRY_DELAY=30000          # Max retry delay in ms (default: 30000)

# Debug Settings
AUTH_DEBUG_TOKEN_LENGTH=20                # Characters to show in token logs (default: 20)
```

#### Common Configuration Scenarios

##### High Security Environment (Short Tokens)

```bash
# Keycloak: 2-minute tokens, very aggressive refresh
AUTH_TOKEN_REFRESH_THRESHOLD=60           # Refresh 1 minute before expiry
AUTH_REFRESH_INTERVAL=1                   # Check every minute
AUTH_SHORT_ABSENCE_THRESHOLD=1            # Immediate refresh on return
```

##### Balanced Security (Current Default)

```bash
# Keycloak: 5-minute tokens, balanced UX/security
AUTH_TOKEN_REFRESH_THRESHOLD=120          # Refresh 2 minutes before expiry
AUTH_REFRESH_INTERVAL=4                   # Check every 4 minutes
AUTH_MEDIUM_ABSENCE_THRESHOLD=4           # Refresh after 4min absence
```

##### Relaxed Environment (Longer Tokens)

```bash
# Keycloak: 15-minute tokens, UX-focused
AUTH_TOKEN_REFRESH_THRESHOLD=300          # Refresh 5 minutes before expiry
AUTH_REFRESH_INTERVAL=10                  # Check every 10 minutes
AUTH_LONG_ABSENCE_THRESHOLD=20            # Only refresh after 20min absence
```

## Configuration Architecture

### File Structure

```bash
lib/auth/
├── config.ts                 # Central configuration with env var support
├── auth.ts                   # JWT callback using AUTH_CONFIG
├── tokenStore.ts             # Redis operations using AUTH_CONFIG
└── ...

components/
└── token-refresh-handler.tsx   # Proactive refresh using AUTH_CONFIG

hooks/auth/
└── use-permissions.ts        # React Query using AUTH_CONFIG
```

### Usage Example

```typescript
import { AUTH_CONFIG, AUTH_COMPUTED } from '@/lib/auth/config';

// Using static config
const refreshThreshold = AUTH_CONFIG.tokens.refreshThresholdSeconds; // 120

// Using computed values
const interval = AUTH_COMPUTED.getRandomizedInterval(); // 4min ± 30s
const retryDelay = AUTH_COMPUTED.getRetryDelay(attemptIndex); // Exponential backoff
```

## Debug Logging System

### Log Levels

#### `debugLog(message, ...args)`

- **When**: Only when `AUTH_DEBUG=true`
- **Use for**: Detailed flow tracing, token status, API calls
- **Output**: `[AUTH_DEBUG] message`

#### `debugStderr(message, ...args)`

- **When**: Always in development mode
- **Use for**: Critical errors, security events, system failures
- **Output**: `[AUTH_CRITICAL] message`

### Usage Examples

```typescript
import { debugLog, debugStderr } from '@/lib/utils/debug-logger';

// Detailed debugging (only when AUTH_DEBUG=true)
debugLog('🔄 Starting token refresh process');
debugLog('📊 Token status:', { timeToExpiry: 120, needsRefresh: true });

// Critical errors (always shown in development)
debugStderr('💥 Token refresh failed with 401 error');
debugStderr('🚨 Redis connection lost during token operation');
```

## Components Using Configuration

### Authentication System

- **`token-refresh-handler.tsx`**: Proactive refresh, visibility detection, retry logic
- **`auth.ts`**: JWT callback flow, token refresh, Redis operations
- **`use-permissions.ts`**: Permission fetching, API errors, retry logic
- **`tokenStore.ts`**: Redis operations, token storage/retrieval

### Configuration Categories

#### 🕒 Timing Configuration

- Token refresh thresholds
- Preventive refresh intervals
- User absence detection
- Lock timeouts

#### 🔄 Retry & Resilience

- Maximum retry attempts
- Exponential backoff delays
- Lock acquisition behavior
- API failure handling

#### 🧠 Cache & Performance

- React Query staleness
- Garbage collection timing
- Random offset distribution
- Redis TTL management

#### 🐛 Debug & Monitoring

- Log verbosity levels
- Token detail exposure
- Performance tracking
- Error categorization

## Configuration Best Practices

### Environment-Specific Settings

#### Development

```bash
AUTH_DEBUG=true                           # Full logging
AUTH_REFRESH_INTERVAL=2                   # Frequent refresh for testing
AUTH_DEBUG_TOKEN_LENGTH=50                # More token detail
```

#### Staging

```bash
AUTH_DEBUG=false                          # Clean logs
AUTH_REFRESH_INTERVAL=4                   # Production-like timing
AUTH_LOCK_TIMEOUT=60                      # More tolerance
```

#### Production

```bash
AUTH_DEBUG=false                          # No debug logs
AUTH_REFRESH_INTERVAL=4                   # Optimized timing
AUTH_LOCK_TIMEOUT=30                      # Tight timing
AUTH_DEBUG_TOKEN_LENGTH=10                # Minimal token exposure
```

### Keycloak Integration

#### Sync with Keycloak Settings

```bash
# If Keycloak SSO Session Idle = 30min
AUTH_SESSION_MAX_AGE=1800

# If Keycloak Access Token = 5min
AUTH_TOKEN_REFRESH_THRESHOLD=120          # Refresh at 3min mark

# If Keycloak Refresh Token Max Reuse = 0
AUTH_LOCK_TIMEOUT=30                      # Prevent race conditions
```

## Quick Setup

### Full Debug Development

```bash
echo "AUTH_DEBUG=true" >> .env.local
echo "AUTH_REFRESH_INTERVAL=2" >> .env.local  
echo "AUTH_DEBUG_TOKEN_LENGTH=50" >> .env.local
npm run dev
```

### Production-Ready

```bash
echo "AUTH_DEBUG=false" >> .env.local
echo "AUTH_REFRESH_INTERVAL=4" >> .env.local
echo "AUTH_LOCK_TIMEOUT=30" >> .env.local
npm run build
```

## Troubleshooting

### Common Issues

#### Tokens Expiring Too Fast

```bash
# Increase refresh threshold
AUTH_TOKEN_REFRESH_THRESHOLD=180          # 3 minutes instead of 2

# More frequent preventive refresh
AUTH_REFRESH_INTERVAL=3                   # Every 3 minutes instead of 4
```

#### User Complaints About Re-login

```bash
# More aggressive return detection
AUTH_SHORT_ABSENCE_THRESHOLD=1            # Refresh after 1 minute
AUTH_MEDIUM_ABSENCE_THRESHOLD=2           # Faster medium threshold
```

#### Race Condition Errors

```bash
# Longer lock timeout
AUTH_LOCK_TIMEOUT=60                      # Double the lock time

# More patient lock waiting
AUTH_LOCK_MAX_WAIT=45                     # Wait longer for locks
```

#### Performance Issues

```bash
# Less frequent refresh
AUTH_REFRESH_INTERVAL=6                   # Every 6 minutes

# Longer cache times
AUTH_QUERY_STALE_TIME=2                   # 2 minutes stale time
AUTH_QUERY_GC_TIME=5                      # 5 minutes GC time
```

## Migration from Hardcoded Values

### Before (Hardcoded)

```typescript
// Bad: Hardcoded values
const interval = 4 * 60 * 1000;           // 4 minutes
const retries = 3;                        // Max retries
const threshold = 120;                    // 2 minutes
```

### After (Configurable)

```typescript
// Good: Configurable values
import { AUTH_CONFIG, AUTH_COMPUTED } from '@/lib/auth/config';

const interval = AUTH_COMPUTED.refreshIntervalMs;
const retries = AUTH_CONFIG.refresh.maxRetries;
const threshold = AUTH_CONFIG.tokens.refreshThresholdSeconds;
```

This system provides complete control over authentication behavior while maintaining sensible defaults for all environments.