# Database-Driven i18n Setup for Next.js 15

This document explains how to use the database-driven internationalization (i18n) system in this Next.js 15 application with local JSON file synchronization.

## Overview

The i18n system uses:

- **next-intl** for internationalization
- **PostgreSQL** database with `dm_translations` table
- **Local JSON files** for development and version control
- **Sync utility script** to keep database and JSON files in sync
- **Next.js cache** for 24-hour caching
- **Prisma** for database operations

## Project Directory Structure

```bash
my-nextjs-i18n-app/
├── .env                              # Environment variables (add to .gitignore)
├── .env.local                        # Local environment variables (add to .gitignore)
├── .gitignore                        # Git ignore file
├── next.config.js                    # Next.js configuration
├── package.json                      # Package dependencies and scripts (UPDATED)
├── tsconfig.json                     # TypeScript configuration
├── tailwind.config.js                # Tailwind CSS configuration (optional)
├── middleware.ts                     # Next.js middleware for locale routing
├── i18n.ts                          # Next-intl configuration
├── navigation.ts                     # Typed navigation helpers
│
├── translations/                     # 🆕 JSON translation files directory
│   ├── en.json                       # English translations
│   ├── es.json                       # Spanish translations
│   ├── fr.json                       # French translations
│   ├── it.json                       # Italian translations
│   └── de.json                       # German translations
│
├── scripts/                          # 🆕 Utility scripts
│   └── sync-translations.ts          # Translation sync utility script
│
├── prisma/
│   ├── schema.prisma                 # Prisma database schema
│   └── seed.ts                       # Database seed file
│
├── lib/
│   ├── prisma.ts                     # Prisma client singleton
│   ├── translations.ts               # Translation loading and caching logic
│   └── admin-translations.ts         # Admin functions for managing translations
│
├── app/
│   ├── globals.css                   # Global CSS styles
│   ├── layout.tsx                    # Root layout (optional, for global providers)
│   │
│   ├── [locale]/                     # Dynamic locale routing
│   │   ├── layout.tsx                # Locale-specific layout with NextIntlClientProvider
│   │   ├── page.tsx                  # Home page with translation examples
│   │   ├── loading.tsx               # Loading UI component (optional)
│   │   ├── error.tsx                 # Error UI component (optional)
│   │   └── not-found.tsx             # Not found page (optional)
│   │
│   └── api/
│       ├── messages/
│       │   └── route.ts              # Cache management API route
│       └── admin/
│           └── translations/
│               └── route.ts          # Translation management API route
│
├── components/                       # Reusable components (optional)
│   ├── ui/                          # UI components
│   └── forms/                       # Form components
│
├── types/                           # TypeScript type definitions (optional)
│   └── index.ts                     # Custom type definitions
│
├── hooks/                           # Custom React hooks (optional)
│   └── use-translations.ts          # Custom translation hooks
│
└── public/                          # Static assets
    ├── favicon.ico
    └── images/
```

## Database Schema

The translations are stored in the `dm_translations` table with the following structure:

```sql
CREATE TABLE dm_translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR NOT NULL,
  locale VARCHAR NOT NULL,
  value TEXT NOT NULL,
  namespace VARCHAR NOT NULL DEFAULT 'common',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(key, locale, namespace)
);
```

## Updated Package.json with Sync Scripts

```json
{
  "name": "my-nextjs-i18n-app",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    
    "db:generate": "prisma generate",
    "db:push": "prisma db push",
    "db:migrate": "prisma migrate dev",
    "db:seed": "tsx prisma/seed.ts",
    "db:studio": "prisma studio",
    
    "sync:init": "tsx scripts/sync-translations.ts init",
    "sync:upload": "tsx scripts/sync-translations.ts upload",
    "sync:download": "tsx scripts/sync-translations.ts download",
    "sync:sync": "tsx scripts/sync-translations.ts sync",
    "sync:compare": "tsx scripts/sync-translations.ts compare",
    "sync:generate-seed": "tsx scripts/sync-translations.ts generate-seed",
    "sync:help": "tsx scripts/sync-translations.ts --help"
  },
  "dependencies": {
    "next": "^15.0.0",
    "react": "^18.0.0",
    "react-dom": "^18.0.0",
    "next-intl": "^3.0.0",
    "prisma": "^5.7.0",
    "@prisma/client": "^5.7.0",
    "commander": "^11.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/react": "^18.0.0",
    "@types/react-dom": "^18.0.0",
    "typescript": "^5.0.0",
    "tsx": "^4.0.0",
    "eslint": "^8.0.0",
    "eslint-config-next": "^15.0.0"
  }
}
```

## Sample Translation Files

**`translations/en.json`**

```json
{
  "common": {
    "welcome": "Welcome",
    "goodbye": "Goodbye",
    "loading": "Loading...",
    "error": "An error occurred",
    "success": "Success"
  },
  "navigation": {
    "home": "Home",
    "about": "About",
    "contact": "Contact Us",
    "products": "Products",
    "services": "Services"
  },
  "forms": {
    "email": "Email Address",
    "password": "Password",
    "firstName": "First Name",
    "lastName": "Last Name",
    "submit": "Submit",
    "cancel": "Cancel",
    "save": "Save",
    "edit": "Edit",
    "delete": "Delete"
  },
  "messages": {
    "loginSuccess": "Login successful",
    "loginError": "Invalid credentials",
    "saveSuccess": "Changes saved successfully",
    "deleteConfirm": "Are you sure you want to delete this item?"
  }
}
```

**`translations/es.json`**

```json
{
  "common": {
    "welcome": "Bienvenido",
    "goodbye": "Adiós",
    "loading": "Cargando...",
    "error": "Ocurrió un error",
    "success": "Éxito"
  },
  "navigation": {
    "home": "Inicio",
    "about": "Acerca de",
    "contact": "Contáctanos",
    "products": "Productos",
    "services": "Servicios"
  },
  "forms": {
    "email": "Correo Electrónico",
    "password": "Contraseña",
    "firstName": "Nombre",
    "lastName": "Apellido",
    "submit": "Enviar",
    "cancel": "Cancelar",
    "save": "Guardar",
    "edit": "Editar",
    "delete": "Eliminar"
  },
  "messages": {
    "loginSuccess": "Inicio de sesión exitoso",
    "loginError": "Credenciales inválidas",
    "saveSuccess": "Cambios guardados exitosamente",
    "deleteConfirm": "¿Estás seguro de que quieres eliminar este elemento?"
  }
}
```

**`translations/it.json`**

```json
{
  "common": {
    "welcome": "Benvenuto",
    "goodbye": "Arrivederci",
    "loading": "Caricamento...",
    "error": "Si è verificato un errore",
    "success": "Successo"
  },
  "navigation": {
    "home": "Home",
    "about": "Chi siamo",
    "contact": "Contattaci",
    "products": "Prodotti",
    "services": "Servizi"
  },
  "forms": {
    "email": "Indirizzo Email",
    "password": "Password",
    "firstName": "Nome",
    "lastName": "Cognome",
    "submit": "Invia",
    "cancel": "Annulla",
    "save": "Salva",
    "edit": "Modifica",
    "delete": "Elimina"
  },
  "messages": {
    "loginSuccess": "Accesso effettuato con successo",
    "loginError": "Credenziali non valide",
    "saveSuccess": "Modifiche salvate con successo",
    "deleteConfirm": "Sei sicuro di voler eliminare questo elemento?"
  }
}
```

## Setup Instructions

### 1. Install Additional Dependencies

```bash
npm install commander
npm install -D tsx
```

### 2. Database Migration

Run the Prisma migration to create the translations table:

```bash
npm run db:migrate
```

### 3. Environment Variables

Make sure your `.env.local` file contains:

```env
DOCUMINDS_DATABASE_URL=postgresql://username:password@localhost:5432/your_database
```

### 4. Initialize Translation Files (First Time Setup)

```bash
# Create sample translation files
npm run sync:init

# Or manually create your translation files in the translations/ directory
```

### 5. Load Your Existing Translation Files

If you already have `it.json`, `en.json`, etc., place them in the `translations/` directory.

### 6. Sync Commands Usage

**Upload translations from JSON files to database:**

```bash
npm run sync:upload
# or for specific locales
npm run sync:upload -- --locales en,es,it
```

**Download translations from database to JSON files:**

```bash
npm run sync:download
# or for specific locales  
npm run sync:download -- --locales en,es,it
```

**Bi-directional sync (recommended):**

```bash
npm run sync:sync
# This will:
# 1. Upload new/changed translations from JSON to DB
# 2. Download new translations from DB to JSON
```

**Compare differences without syncing:**

```bash
npm run sync:compare
```

**Generate seed file from database translations:**

```bash
npm run sync:generate-seed
# or for specific locales
npm run sync:generate-seed -- --locales en,es,it
```

## Seed File Generation

### Generate Database Seed from Current Translations

The `sync:generate-seed` command creates a `prisma/seed-translations.ts` file from all translations currently stored in the database. This is useful for:

- **Backup**: Create a seed file from your current database state
- **Migration**: Generate seed files for different environments  
- **Version Control**: Create static seed files from dynamic database content
- **Distribution**: Share translation seeds with other developers

```bash
# Generate seed file with all supported locales
npm run sync:generate-seed

# Generate seed file for specific locales only
npm run sync:generate-seed -- --locales en,it

# Run the generated seed file
npm run db:seed-translations
```

The generated seed file will:

- Include all translations from the database for specified locales
- Be formatted exactly like the existing `seed-translations.ts` structure
- Be saved to `prisma/seed-translations.ts`
- Show a summary of included translations by locale and namespace
- Properly escape special characters in translation values

## Development Workflow

### For developers adding translations in JSON files

```bash
# 1. Edit translations/en.json, translations/es.json, etc.
# 2. Upload to database
npm run sync:upload
```

### For developers adding translations in database

```bash
# 1. Add translations via database/admin interface
# 2. Download to JSON files
npm run sync:download
```

### Regular sync (recommended)

```bash
# Keep everything in sync
npm run sync:sync
```

## Usage

### Using Translations in Components

```tsx
'use client';

import { useTranslations } from 'next-intl';

export default function MyComponent() {
  const t = useTranslations();
  
  return (
    <div>
      <h1>{t('welcome')}</h1>
      <p>{t('navigation.home')}</p>
      <button>{t('forms.submit')}</button>
    </div>
  );
}
```

### Using Translations in Server Components

```tsx
import { getTranslations } from 'next-intl/server';

export default async function ServerComponent() {
  const t = await getTranslations();
  
  return (
    <div>
      <h1>{t('welcome')}</h1>
      <p>{t('navigation.home')}</p>
    </div>
  );
}
```

## Cache Management

### Automatic Cache

- Translations are cached for **24 hours** automatically
- Cache is shared across all requests
- Cache is invalidated when translations are modified via admin functions

### Manual Cache Reset

Reset the cache via HTTP request:

```bash
curl http://localhost:3000/api/messages?action=reset
```

Or use the development button in the UI (see `TranslationExample` component).

## Translation Management

### Adding Translations Programmatically

```typescript
import { createTranslation } from '@/lib/admin-translations';

// Add a new translation
await createTranslation('new_key', 'en', 'New Value', 'common');
await createTranslation('new_key', 'it', 'Nuovo Valore', 'common');
```

### Using the Admin API

#### Get translations for a locale

```bash
GET /api/admin/translations?locale=en
```

#### Create/Update a translation

```bash
POST /api/admin/translations
Content-Type: application/json

{
  "key": "new_key",
  "locale": "en",
  "value": "New Value",
  "namespace": "common"
}
```

#### Delete a translation

```bash
DELETE /api/admin/translations
Content-Type: application/json

{
  "key": "old_key",
  "locale": "en",
  "namespace": "common"
}
```

## Namespace Organization

Translations are organized by namespaces:

- `common` - General translations (welcome, hello, etc.)
- `navigation` - Navigation items (home, about, contact)
- `forms` - Form-related translations (submit, cancel, save)
- `messages` - User messages and notifications
- `errors` - Error messages

### Accessing Namespaced Translations

```tsx
// For namespace 'navigation' and key 'home'
{t('navigation.home')}

// For namespace 'forms' and key 'submit'
{t('forms.submit')}

// For namespace 'common' and key 'welcome' (common can be omitted)
{t('welcome')}
```

## Supported Locales

Currently configured locales:

- `en` - English
- `es` - Spanish
- `fr` - French
- `it` - Italian
- `de` - German

To add more locales:

1. Update `config/locales.ts`
2. Add translations to the database or JSON files
3. Run `npm run sync:sync` to synchronize
4. Update the middleware matcher if needed

## Features of the Sync Utility

✅ **Bi-directional sync** - JSON ↔ Database  
✅ **Namespace support** - Handles nested translations  
✅ **Conflict detection** - Shows differences between sources  
✅ **Selective sync** - Choose specific locales  
✅ **Backup safety** - Always preserves existing data  
✅ **Seed generation** - Create seed files from database  
✅ **CLI interface** - Easy to use commands  
✅ **TypeScript** - Full type safety  

## Example Workflow

1. **Initial setup:**

   ```bash
   npm run sync:init      # Create sample files
   npm run sync:upload    # Upload to database
   ```

2. **Developer A adds translations in JSON:**

   ```bash
   # Edit translations/en.json
   npm run sync:upload    # Upload changes
   ```

3. **Developer B adds translations in database:**

   ```bash
   # Add via admin interface or direct DB
   npm run sync:download  # Download changes
   ```

4. **Keep everything in sync:**

   ```bash
   npm run sync:sync      # Bi-directional sync
   ```

## Performance

- **First Load**: Translations are loaded from database
- **Subsequent Loads**: Served from Next.js cache (24h TTL)
- **Cache Miss**: Automatic fallback to database
- **Cache Reset**: Manual via API endpoint
- **Development**: Local JSON files for fast iteration

## Development Tools

The `TranslationExample` component includes a cache reset button for development purposes. This allows you to test translation changes without waiting for cache expiration.

## Troubleshooting

### Cache Not Updating

- Use the cache reset API: `GET /api/messages?action=reset`
- Check database connectivity
- Verify Prisma client is properly configured

### Missing Translations

- Check if translations exist in database or JSON files
- Run `npm run sync:compare` to see differences
- Verify locale is supported
- Check namespace and key combination

### Sync Issues

- Check file permissions in `translations/` directory
- Verify database connection
- Run `npm run sync:compare` to diagnose differences
- Check console output for specific error messages

### Database Connection Issues

- Verify `DOCUMINDS_DATABASE_URL` environment variable
- Check database server is running
- Run `npm run db:generate` to update Prisma client

This setup allows your team to work with translations in their preferred way (JSON files or database) while keeping everything synchronized.
