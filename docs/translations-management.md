# Simple Translations Management

A clean, efficient interface for managing your app's i18n translations with focus on getting the job done quickly.

## Features

### ✨ Key Features
- **Inline Editing**: Click any translation to edit directly
- **Smart Organization**: Missing translations shown first
- **Visual Status**: Clear completion indicators per namespace
- **Quick Actions**: Bulk translate missing entries
- **Import/Export**: Simple JSON-based backup and restore
- **Real-time Search**: Find keys and values instantly

### 🎯 Design Principles
- **Simplicity First**: No unnecessary complexity
- **Visual Hierarchy**: Status at a glance
- **Efficient Workflow**: Minimal clicks to complete tasks
- **Mobile Responsive**: Works on all devices

## Usage

### Accessing the Interface
1. Navigate to **Dashboard → Admin → Translations**
2. Select a namespace or view all translations
3. Use search to find specific keys

### Managing Translations

#### Adding New Keys
1. Click **"Add Key"** button
2. Select namespace and enter key name
3. Provide English translation
4. Optionally auto-translate to other locales

#### Editing Translations
1. Click on any translation card to expand
2. Click on translation text to edit inline
3. Press Enter to save, Escape to cancel
4. Auto-saves on blur

#### Quick Translation
1. Expand a card with missing translations
2. Click **"Quick Translate Missing"**
3. Generates placeholder translations for missing locales

#### Bulk Operations
1. Use namespace filter to focus on specific areas
2. Filter by "Missing only" to see incomplete translations
3. Export/Import for backup or bulk editing

### Import/Export

#### Export
- Click **Export** to download current view as JSON
- Filename includes namespace and date
- Preserves hierarchical structure

#### Import
- Click **Import** and select JSON file
- Preview changes before confirming
- Overwrites existing translations

## Technical Details

### API Endpoints
- `GET /api/admin/translations` - Fetch all translations
- `POST /api/admin/translations` - Create translation
- `PUT /api/admin/translations` - Update translation
- `DELETE /api/admin/translations` - Delete translation key
- `GET /api/admin/translations/namespaces` - Get namespaces
- `GET /api/admin/translations/export` - Export translations
- `POST /api/admin/translations/import` - Import translations

### Database Schema
```sql
model Translation {
  id        String   @id @default(cuid())
  key       String
  locale    String
  value     String
  namespace String   @default("common")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([key, locale, namespace], name: "key_locale_namespace")
}
```

### Migration
Run the migration script to populate database from existing JSON files:
```bash
npx tsx scripts/migrate-translations.ts
```

## Supported Locales

Currently configured locales:
- 🇺🇸 English (en) - Primary
- 🇮🇹 Italian (it)

To add more locales:
1. Update `config/locales.ts`
2. Update `SUPPORTED_LOCALES` in components
3. Add translation files in `messages/` directory

## Best Practices

### Key Naming
- Use dot notation: `hero.title`, `navigation.about`
- Group related keys under same namespace
- Keep keys descriptive but concise

### Translation Quality
- Always provide English translation first
- Use placeholders for dynamic content: `{name}`, `{count}`
- Keep translations contextually appropriate

### Workflow
1. **Plan**: Define key structure before adding
2. **English First**: Complete English translations
3. **Review**: Check context and accuracy
4. **Translate**: Add other language versions
5. **Test**: Verify in actual application

## Troubleshooting

### Common Issues

**Translations not appearing in app**
- Check cache invalidation
- Verify namespace matches usage
- Ensure key structure is correct

**Import/Export not working**
- Verify JSON format matches expected structure
- Check file permissions
- Review browser console for errors

**Performance issues**
- Use namespace filtering for large datasets
- Consider pagination for very large translation sets
- Monitor database query performance

### Support
For issues or feature requests, check the application logs and database connectivity. 