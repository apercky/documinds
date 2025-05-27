# Decrypt Value Script

The `decrypt-value.ts` script allows you to decrypt encrypted values stored in the database using your SERVER_KEY. This is useful for debugging, verifying encrypted data, and troubleshooting encryption issues.

## Overview

The script provides three main functions:

- Decrypt a specific setting for a brand
- Decrypt all settings for a brand
- Decrypt a raw encrypted value

## Prerequisites

- SERVER_KEY environment variable must be set
- Database must be accessible
- Prisma client must be configured

## Usage

### Basic Syntax

```bash
SERVER_KEY="your-server-key" npx tsx scripts/decrypt-value.ts <command> [options]
```

### Commands

#### 1. Decrypt All Settings for a Brand

Decrypt and display all settings for a specific brand:

```bash
SERVER_KEY="B/NmpaBbBjJWSpMYTHd5Blm+os077dbUvkTlP4jy0CA=" npx tsx scripts/decrypt-value.ts brand 2_20
```

**Output Example:**

```bash
🔓 Decrypting all settings for brand: 2_20

📋 OPENAI_API_KEY:
   🔐 Encrypted value (first 40 chars): 6102d7aa09e5166cf61969e0aead17c2:eb8df6c...
   ✅ Decrypted: sk-proj-MIBS7jz8T2FvLV7oXGsqJ6o-o-MjDQ84DzjcirNh-AU1w8x0RiloamyPlx7RQG7Qes2uF_PqUCT3BlbkFJI

📋 LANGFLOW_API_KEY:
   🔐 Encrypted value (first 40 chars): e79332684d7d414a04f0fd66a5fdcf97:c4e739a...
   ✅ Decrypted: sk-s6KmIeymVzrpOlkiSEwH1Lqv_9Vvciz_ilWoTmimr30

📋 LANGFLOW_FLOW_CHAT_ID:
   📝 Plain value: flow-12345

📋 LANGFLOW_FLOW_EMBEDDINGS_ID:
   📝 Plain value: 1fa7f1e6-acb5-440d-98a1-b7cc369b8924
```

#### 2. Decrypt a Specific Setting

Decrypt a single setting for a brand:

```bash
SERVER_KEY="B/NmpaBbBjJWSpMYTHd5Blm+os077dbUvkTlP4jy0CA=" npx tsx scripts/decrypt-value.ts setting 2_20 OPENAI_API_KEY
```

**Output Example:**

```bash
🔓 Decrypting setting: 2_20/OPENAI_API_KEY
   📊 Setting info:
     - Encrypted: true
     - Has encrypted value: true
     - Has plain value: false
     - Created: 2024-01-15T10:30:00.000Z
     - Updated: 2024-01-15T10:30:00.000Z
     - Last modified by: user@example.com
   🔐 Encrypted value (first 40 chars): 6102d7aa09e5166cf61969e0aead17c2:eb8df6c...
   ✅ Decrypted value: sk-proj-MIBS7jz8T2FvLV7oXGsqJ6o-o-MjDQ84DzjcirNh-AU1w8x0RiloamyPlx7RQG7Qes2uF_PqUCT3BlbkFJI
```

#### 3. Decrypt a Raw Encrypted Value

Decrypt an encrypted value directly (not from database):

```bash
SERVER_KEY="B/NmpaBbBjJWSpMYTHd5Blm+os077dbUvkTlP4jy0CA=" npx tsx scripts/decrypt-value.ts raw "6102d7aa09e5166cf61969e0aead17c2:eb8df6c..."
```

**Output Example:**

```bash
🔓 Decrypting raw value...
   🔐 Encrypted (first 40 chars): 6102d7aa09e5166cf61969e0aead17c2:eb8df6c...
   ✅ Decrypted: sk-proj-MIBS7jz8T2FvLV7oXGsqJ6o-o-MjDQ84DzjcirNh-AU1w8x0RiloamyPlx7RQG7Qes2uF_PqUCT3BlbkFJI
```

## Available Setting Keys

- `OPENAI_API_KEY` - OpenAI API key (encrypted)
- `LANGFLOW_API_KEY` - Langflow API key (encrypted)
- `LANGFLOW_FLOW_CHAT_ID` - Langflow chat flow ID (plain text)
- `LANGFLOW_FLOW_EMBEDDINGS_ID` - Langflow embeddings flow ID (plain text)

## Available Brand Codes

- `2_20` - DIESEL
- `4_40` - MARNI
- `5_80` - Maison Margiela

## Error Handling

The script includes comprehensive error handling:

### Missing SERVER_KEY

```bash
npx tsx scripts/decrypt-value.ts brand 2_20
# Output: ❌ Decryption failed: Error: SERVER_KEY environment variable must be set for decryption
```

### Invalid Brand Code

```bash
SERVER_KEY="B/NmpaBbBjJWSpMYTHd5Blm+os077dbUvkTlP4jy0CA=" npx tsx scripts/decrypt-value.ts brand invalid_brand
# Output: ❌ No settings found for brand: invalid_brand
```

### Invalid Setting Key

```bash
SERVER_KEY="B/NmpaBbBjJWSpMYTHd5Blm+os077dbUvkTlP4jy0CA=" npx tsx scripts/decrypt-value.ts setting 2_20 INVALID_KEY
# Output: ❌ Setting not found: 2_20/INVALID_KEY
```

### Invalid Encrypted Value Format

```bash
SERVER_KEY="B/NmpaBbBjJWSpMYTHd5Blm+os077dbUvkTlP4jy0CA=" npx tsx scripts/decrypt-value.ts raw "invalid-format"
# Output: ❌ Decryption failed: Error: Invalid encrypted value format. Expected format: iv:encrypted_data
```

## Security Notes

- **Never commit the SERVER_KEY to version control**
- The script only displays the first 40 characters of encrypted values for security
- Decrypted values are shown in full - use caution in shared environments
- The script uses the same AES-256-CBC encryption as the application

## Troubleshooting

### Common Issues

1. **Database Connection Issues**
   - Ensure your database is running and accessible
   - Check your Prisma configuration

2. **Permission Issues**
   - Ensure the script has read access to the database
   - Check your database user permissions

3. **Encryption Format Issues**
   - Encrypted values should be in format: `iv:encrypted_data`
   - IV should be 32 hex characters (16 bytes)
   - Encrypted data should not be empty

### Debug Mode

For additional debugging information, you can enable Prisma query logging by setting:

```bash
DEBUG="prisma:query" SERVER_KEY="B/NmpaBbBjJWSpMYTHd5Blm+os077dbUvkTlP4jy0CA=" npx tsx scripts/decrypt-value.ts brand 2_20
```

## Related Files

- `scripts/decrypt-value.ts` - The main script file
- `lib/services/settings.service.ts` - Settings service with encryption functions
- `lib/prisma/schema.prisma` - Database schema definitions
- `app/api/settings/[brandCode]/route.ts` - Settings API endpoints 