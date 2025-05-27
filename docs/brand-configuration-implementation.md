# Brand Configuration Implementation

## Overview

This implementation provides a comprehensive brand-specific API key management system for the Next.js application with secure encryption, multi-language support, and seamless integration with existing authentication.

## Features Implemented

### 🗄️ Database Schema

- **Companies Table** (`dm_companies`): Stores brand information with unique brand codes
- **Settings Table** (`dm_settings`): Stores brand-specific configuration with selective encryption
- **Foreign Key Relationship**: Links settings to companies via `brandCode`

### 🔐 Security Features

- **AES Encryption**: API keys are encrypted using AES-256-CBC with proper key derivation
- **Selective Encryption**: Only sensitive data (API keys) are encrypted, flow IDs remain plain text
- **Brand Isolation**: Each brand can only access their own settings
- **Audit Trail**: Tracks who created/modified settings and when

### 🌍 Internationalization

- **English & Italian Support**: Complete translation for all UI elements
- **Dynamic Content**: Parameter interpolation for company names and dynamic messages
- **Consistent Naming**: Follows existing i18n patterns in the application

### 🎨 User Interface

- **Modern Design**: Uses Shadcn/ui components with Tailwind CSS
- **Responsive Layout**: Works on all screen sizes
- **Loading States**: Proper loading indicators during API calls
- **Error Handling**: User-friendly error messages with translations
- **Password Visibility**: Toggle show/hide for API keys

### 🔌 API Integration

- **Brand-Specific Settings**: Chat and embed APIs now use brand-specific settings from database
- **Fallback Handling**: Graceful error handling when settings are missing
- **Real-time Updates**: Settings changes are immediately available to APIs

## File Structure

```bash
├── lib/
│   ├── services/
│   │   ├── company.service.ts      # Brand validation and company management
│   │   └── settings.service.ts     # Settings CRUD with encryption/decryption
│   └── prisma/
│       └── schema.prisma           # Database schema with new tables
├── app/
│   ├── api/
│   │   ├── companies/
│   │   │   └── validate/route.ts   # Brand validation endpoint
│   │   ├── settings/
│   │   │   └── [brandCode]/route.ts # Settings management API
│   │   ├── chat/route.ts           # Updated to use brand settings
│   │   └── store/embed/route.ts    # Updated to use brand settings
│   └── [locale]/
│       └── settings/
│           └── components/
│               ├── BrandConfigurationSection.tsx
│               └── SettingCard.tsx
├── messages/
│   ├── en.json                     # English translations
│   └── it.json                     # Italian translations
└── scripts/
    ├── migrate-encryption.ts       # Migration script for bcrypt to AES
    └── test-brand-settings.ts      # Comprehensive test suite
```

## Database Schema Details

### Companies Table (`dm_companies`)

```sql
CREATE TABLE dm_companies (
  id SERIAL PRIMARY KEY,
  code VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  brand_code VARCHAR(255) NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Settings Table (`dm_settings`)

```sql
CREATE TABLE dm_settings (
  id SERIAL PRIMARY KEY,
  brand_code VARCHAR(255) NOT NULL,
  setting_key dm_setting_key NOT NULL,
  encrypted_value TEXT,
  plain_value TEXT,
  is_encrypted BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by VARCHAR(255),
  last_modified_by VARCHAR(255),
  UNIQUE(brand_code, setting_key),
  FOREIGN KEY (brand_code) REFERENCES dm_companies(brand_code)
);
```

### Setting Keys Enum

```sql
CREATE TYPE dm_setting_key AS ENUM (
  'OPENAI_API_KEY',
  'LANGFLOW_API_KEY', 
  'LANGFLOW_FLOW_CHAT_ID',
  'LANGFLOW_FLOW_EMBEDDINGS_ID'
);
```

## Security Implementation

### Encryption Method

- **Algorithm**: AES-256-CBC
- **Key Derivation**: scrypt with salt
- **IV**: Random 16-byte initialization vector per encryption
- **Format**: `{iv_hex}:{encrypted_data_hex}`

### Access Control

- Users can only access settings for their authenticated brand
- Brand validation occurs on every API request
- Settings are isolated by `brandCode` in all queries

## API Endpoints

### Brand Validation

```bash
GET /api/companies/validate?brandCode={code}
```

### Settings Management

```bash
GET /api/settings/{brandCode}     # Get all settings for brand
PUT /api/settings/{brandCode}     # Update settings for brand
```

## Migration Strategy

### From bcrypt to AES

1. **Detection**: Identify bcrypt hashes by pattern (`$2a$`, `$2b$`, etc.)
2. **Clearing**: Remove bcrypt values (cannot be decrypted)
3. **User Action**: Force re-entry through UI
4. **New Encryption**: Use AES for all new API keys

### Running Migration

```bash
npx tsx scripts/migrate-encryption.ts
```

## Testing

### Comprehensive Test Suite

```bash
npx tsx scripts/test-brand-settings.ts
```

Tests cover:

- Brand validation
- API key encryption/decryption
- Plain text settings
- Database state verification
- Error handling

## Usage Examples

### Frontend Component

```tsx
import { BrandConfigurationSection } from './BrandConfigurationSection';

// In your settings page
<BrandConfigurationSection />
```

### Backend Service

```typescript
import { getBrandSettings } from '@/lib/services/settings.service';

// Get decrypted settings for API usage
const settings = await getBrandSettings(brandCode);
const apiKey = settings.openaiApiKey; // Automatically decrypted
```

## Environment Variables Required

```env
SERVER_KEY=your-encryption-key-here  # For AES encryption
```

## Future Enhancements

1. **Settings Versioning**: Track changes over time
2. **Bulk Import/Export**: CSV/JSON import for multiple brands
3. **Settings Templates**: Default configurations for new brands
4. **Advanced Permissions**: Role-based access to specific settings
5. **Settings Validation**: Validate API keys before saving

## Troubleshooting

### Common Issues

1. **Encryption Errors**: Check `SERVER_KEY` environment variable
2. **Brand Not Found**: Ensure company exists with correct `brandCode`
3. **Migration Issues**: Run migration script for bcrypt cleanup
4. **API Integration**: Verify brand context is available in API routes

### Debug Mode

Enable Prisma query logging:

```env
DEBUG=prisma:query
```

## Security Considerations

1. **Key Rotation**: Regularly rotate the `SERVER_KEY`
2. **Access Logs**: Monitor API access patterns
3. **Data Backup**: Ensure encrypted settings are backed up
4. **Network Security**: Use HTTPS for all API communications
5. **Input Validation**: All inputs are validated and sanitized

---

This implementation provides enterprise-grade brand management with complete data isolation, secure encrypted storage, and seamless integration with the existing Next.js application architecture.