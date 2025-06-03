# Essential Authentication Environment Variables

## Quick Setup (.env.local)

```bash
# === CORE AUTHENTICATION SETTINGS ===
# Enable debug logs during development
AUTH_DEBUG=true

# === TOKEN TIMING (CRITICAL) ===
# Refresh tokens N seconds before expiry - Key for preventing 401 errors
AUTH_TOKEN_REFRESH_THRESHOLD=120

# Proactive refresh check every N minutes - Balances UX vs performance  
AUTH_REFRESH_INTERVAL=4

# === SESSION ALIGNMENT ===
# NextAuth session duration (seconds) - MUST match Keycloak SSO Session Idle
AUTH_SESSION_MAX_AGE=1800

# === USER EXPERIENCE ===
# Auto-refresh when user returns after N minutes away
AUTH_MEDIUM_ABSENCE_THRESHOLD=4
```

## Typical Configurations

### Development (Frequent Debugging)

```bash
AUTH_DEBUG=true
AUTH_TOKEN_REFRESH_THRESHOLD=120
AUTH_REFRESH_INTERVAL=2
AUTH_MEDIUM_ABSENCE_THRESHOLD=2
```

### Production (Optimized)  

```bash
AUTH_DEBUG=false
AUTH_TOKEN_REFRESH_THRESHOLD=120
AUTH_REFRESH_INTERVAL=4
AUTH_MEDIUM_ABSENCE_THRESHOLD=4
```

### High Security (Aggressive Refresh)

```bash
AUTH_DEBUG=false
AUTH_TOKEN_REFRESH_THRESHOLD=60
AUTH_REFRESH_INTERVAL=3
AUTH_MEDIUM_ABSENCE_THRESHOLD=2
```

## Key Variable Explanations

### `AUTH_TOKEN_REFRESH_THRESHOLD=120`

- **What**: Refresh tokens 120 seconds (2 minutes) before they expire
- **Why**: Prevents race conditions and gives buffer time
- **Keycloak sync**: If tokens expire in 5min, refresh starts at 3min mark
- **Adjust if**: Users getting 401 errors → lower value (90, 60)

### `AUTH_REFRESH_INTERVAL=4` 

- **What**: Check if refresh needed every 4 minutes
- **Why**: Proactive refresh prevents expiry during user activity
- **Performance**: Lower = more responsive, higher = less load
- **Adjust if**: Performance issues → increase to 6-8

### `AUTH_SESSION_MAX_AGE=1800`

- **What**: NextAuth session lasts 30 minutes (1800 seconds)
- **Why**: Should match Keycloak "SSO Session Idle" setting exactly
- **Critical**: Mismatch causes auth desync issues
- **Adjust when**: Changing Keycloak session timeouts

### `AUTH_MEDIUM_ABSENCE_THRESHOLD=4`

- **What**: Auto-refresh if user away for 4+ minutes
- **Why**: Seamless experience when returning to app
- **UX impact**: Lower = more responsive, higher = less background activity
- **Adjust if**: User complaints → lower to 2-3 minutes

## When NOT to Add More Variables

The system has 20+ configurable parameters, but these 5 cover 95% of use cases:

**Skip these unless you have specific issues:**

- `AUTH_LOCK_TIMEOUT` (default 30s works fine)
- `AUTH_REFRESH_MAX_RETRIES` (default 3 is good)
- `AUTH_REDIS_TTL_EXTRA` (default 2hrs is safe)
- `AUTH_QUERY_*` settings (defaults optimized)
- `AUTH_SHORT_ABSENCE_*` / `AUTH_LONG_ABSENCE_*` (rarely needed)

## Troubleshooting with Essential Vars

### Problem: Users getting 401 errors

```bash
# Solution: Refresh earlier
AUTH_TOKEN_REFRESH_THRESHOLD=90  # Was 120
```

### Problem: Too many API calls / Performance

```bash
# Solution: Less frequent checks  
AUTH_REFRESH_INTERVAL=6  # Was 4
```

### Problem: Users forced to re-login often

```bash
# Solution: More aggressive return detection
AUTH_MEDIUM_ABSENCE_THRESHOLD=2  # Was 4
```

### Problem: Auth system seems slow

```bash
# Solution: More frequent proactive refresh
AUTH_REFRESH_INTERVAL=3  # Was 4
```

Keep it simple! These 5 variables handle the vast majority of authentication configuration needs. 