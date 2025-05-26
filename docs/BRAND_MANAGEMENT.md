# Brand-Specific API Key Management System

## Overview

This system provides enterprise-level brand management with secure API key storage and company-based validation. It allows different brands/companies to manage their own API configurations independently while maintaining security and data isolation.

## Architecture

### Database Schema

#### Companies Table (`dm_companies`)
- **Purpose**: Manage supported brands and company information
- **Key Fields**:
  - `brand_code`: Unique identifier matching session.user.brand
  - `name`: Display name of the company
  - `description`: Optional company description
  - `is_active`: Enable/disable brand access

#### Settings Table (`dm_settings`)
- **Purpose**: Store brand-specific API configurations
- **Key Fields**:
  - `brand_code`: Foreign key to companies table
  - `setting_key`: Enum (OPENAI_API_KEY, LANGFLOW_API_KEY, etc.)
  - `encrypted_value`: Bcrypt encrypted API keys
  - `plain_value`: Unencrypted flow IDs
  - `is_encrypted`: Boolean flag for encryption status

### Security Features

1. **Selective Encryption**: API keys are encrypted with bcrypt, flow IDs stored as plain text
2. **Brand Isolation**: Complete data separation between different brands
3. **Access Validation**: Users can only access their validated brand
4. **Audit Trail**: Track who created/modified settings

## API Endpoints

### Brand Validation
```
GET /api/companies/validate?brand={brandCode}
```
- Validates if a brand code exists and is active
- Returns company information if valid
- Used for initial brand access validation

### Settings Management
```
GET /api/settings/{brandCode}
PUT /api/settings/{brandCode}
```
- Get/update settings for a specific brand
- Automatic brand validation before access
- Masked values for encrypted settings

## UI Components

### BrandConfigurationSection
Main component that handles:
- Brand validation and loading states
- Company information display
- Settings management interface
- Error handling for invalid brands

### SettingCard
Reusable component for individual settings:
- Different icons for different setting types
- Encrypted/plain text input handling
- Show/hide password functionality
- Company context display

## Configuration Types

### API Keys (Encrypted)
1. **OpenAI API Key**: For AI-powered features
2. **Langflow API Key**: For workflow management

### Flow IDs (Plain Text)
1. **Chat Flow ID**: Langflow chat workflow identifier
2. **Embeddings Flow ID**: Data processing workflow identifier

## Setup Instructions

### 1. Database Migration
```bash
npx prisma db push
npx prisma generate
```

### 2. Initialize Companies
```bash
npx tsx scripts/setup-companies.ts
```

### 3. Environment Variables
Ensure `SERVER_KEY` is set for encryption:
```env
SERVER_KEY=your-secure-server-key
```

## Usage

### For Developers

1. **Brand Validation**: Always validate brand access before showing settings
2. **Error Handling**: Handle invalid/inactive brands gracefully
3. **Security**: Never expose encrypted values in API responses
4. **Audit**: Track user actions for compliance

### For Administrators

1. **Company Management**: Add new companies via database or admin interface
2. **Brand Activation**: Enable/disable brands using `is_active` flag
3. **Settings Overview**: Monitor configuration completeness across brands

## Brand States

### Valid Brand
- Shows full configuration interface
- Displays company information
- Enables all settings management

### Invalid Brand
- Shows error message with brand code
- Provides contact information
- Hides configuration interface

### Loading State
- Shows validation progress
- Skeleton loading for better UX

## Security Considerations

1. **Encryption**: API keys use bcrypt with 12 salt rounds
2. **Access Control**: Role-based access (USER, EDITOR, ADMIN)
3. **Data Isolation**: Complete separation between brands
4. **Audit Logging**: Track all setting modifications

## Future Enhancements

1. **Admin Interface**: Web-based company management
2. **API Key Validation**: Test API keys for validity
3. **Usage Analytics**: Track configuration usage by brand
4. **Bulk Operations**: Mass configuration updates
5. **Role-based Permissions**: Fine-grained access control within companies

## Troubleshooting

### Common Issues

1. **Brand Not Found**: Check if company exists in `dm_companies` table
2. **Settings Not Loading**: Verify brand validation is successful
3. **Encryption Errors**: Ensure `SERVER_KEY` environment variable is set
4. **Permission Denied**: Check user roles and brand access

### Debug Steps

1. Check browser network tab for API errors
2. Verify database connections and table existence
3. Confirm environment variables are loaded
4. Review server logs for detailed error messages

## API Response Examples

### Successful Brand Validation
```json
{
  "company": {
    "id": 1,
    "code": "ACME",
    "name": "ACME Corporation",
    "description": "Leading technology solutions provider",
    "brandCode": "ACME_CORP",
    "settingsCount": 2
  },
  "isValid": true
}
```

### Settings Response
```json
{
  "company": {
    "id": 1,
    "name": "ACME Corporation",
    "brandCode": "ACME_CORP"
  },
  "settings": [
    {
      "settingKey": "OPENAI_API_KEY",
      "value": "••••••••",
      "isEncrypted": true,
      "hasValue": true,
      "updatedAt": "2024-01-01T00:00:00Z",
      "lastModifiedBy": "user123"
    }
  ]
}
```

This system provides a robust foundation for multi-brand API key management with enterprise-level security and user experience. 