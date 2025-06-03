# Debug Logging System

## Overview

The authentication system uses a centralized debug logging utility to control log output via environment variables.

## Configuration

### Environment Variables

```bash
# .env.local
AUTH_DEBUG=true  # Enable detailed authentication debug logs
```

### Log Levels

#### `debugLog(message, ...args)`

- **When**: Only when `AUTH_DEBUG=true`
- **Use for**: Detailed flow tracing, token status, API calls
- **Output**: `[AUTH_DEBUG] message`

#### `debugStderr(message, ...args)`

- **When**: Always in development mode
- **Use for**: Critical errors, security events, system failures
- **Output**: `[AUTH_CRITICAL] message`

## Usage Examples

```typescript
import { debugLog, debugStderr } from '@/lib/utils/debug-logger';

// Detailed debugging (only when AUTH_DEBUG=true)
debugLog('🔄 Starting token refresh process');
debugLog('📊 Token status:', { timeToExpiry: 120, needsRefresh: true });

// Critical errors (always shown in development)
debugStderr('💥 Token refresh failed with 401 error');
debugStderr('🚨 Redis connection lost during token operation');
```

## Components Using Debug Logging

### Authentication System

- **`TokenRefreshHandler.tsx`**: Proactive refresh, visibility detection, retry logic
- **`auth.ts`**: JWT callback flow, token refresh, Redis operations
- **`use-permissions.ts`**: Permission fetching, API errors, retry logic
- **`tokenStore.ts`**: Redis operations, token storage/retrieval

### Log Categories

#### 🔄 Process Flow

- Token refresh cycles
- JWT callback triggers
- Session updates

#### 📊 Status Information

- Token expiry times
- Redis connection status
- API response codes

#### ⚠️ Warning Events

- Lock acquisition failures
- Retry attempts
- Timeout scenarios

#### ❌ Critical Errors

- Authentication failures
- Redis connection issues
- Token refresh failures

## Production Considerations

- **Debug logs**: Completely disabled in production (performance)
- **Critical logs**: Only appear in development (security)
- **Performance**: Zero overhead when `AUTH_DEBUG=false`

## Quick Debug Setup

```bash
# Enable full authentication debugging
echo "AUTH_DEBUG=true" >> .env.local

# Restart your development server
npm run dev

# Logs will appear with [AUTH_DEBUG] prefix
```

## Troubleshooting Common Issues

### No Logs Appearing

1. Check `AUTH_DEBUG=true` in `.env.local`
2. Restart development server
3. Verify browser console (client logs) and terminal (server logs)

### Too Many Logs

1. Set `AUTH_DEBUG=false` or remove from `.env.local`
2. Critical errors will still appear with `[AUTH_CRITICAL]` prefix

### Production Logs

- Debug logs are automatically disabled in production
- Only use `debugStderr` for genuinely critical issues
- Consider proper monitoring/alerting for production environments 