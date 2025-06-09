// scripts/sync-translations.ts - Main sync utility script
import { locales } from "@/config/locales";
import { PrismaClient } from "@prisma/client";
import { program } from "commander";
import * as fs from "fs/promises";
import * as path from "path";

const prisma = new PrismaClient();

interface TranslationFile {
  [key: string]: string | TranslationFile;
}

interface FlatTranslation {
  key: string;
  value: string;
  namespace: string;
}

// Configuration
const TRANSLATIONS_DIR = "messages";
const SUPPORTED_LOCALES = locales; // Add your locales here

// Utility function to flatten nested translation objects
function flattenTranslations(
  obj: TranslationFile,
  prefix: string = "",
  namespace: string = "common"
): FlatTranslation[] {
  const result: FlatTranslation[] = [];

  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (typeof value === "string") {
      result.push({
        key: fullKey,
        value,
        namespace,
      });
    } else if (typeof value === "object" && value !== null) {
      // If it's the first level and looks like a namespace, use it as namespace
      const isNamespace = !prefix && typeof value === "object";
      const newNamespace = isNamespace ? key : namespace;
      const newPrefix = isNamespace ? "" : fullKey;

      result.push(...flattenTranslations(value, newPrefix, newNamespace));
    }
  }

  return result;
}

// Utility function to create nested object from flat translations
function createNestedObject(translations: FlatTranslation[]): TranslationFile {
  const result: TranslationFile = {};

  translations.forEach(({ key, value, namespace }) => {
    // Combine namespace and key if namespace is not 'common'
    const fullKey = namespace === "common" ? key : `${namespace}.${key}`;
    const keys = fullKey.split(".");

    let current = result;
    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) {
        current[keys[i]] = {};
      }
      current = current[keys[i]] as TranslationFile;
    }

    current[keys[keys.length - 1]] = value;
  });

  return result;
}

// Load translations from JSON file
async function loadTranslationsFromFile(
  locale: string
): Promise<FlatTranslation[]> {
  const filePath = path.join(TRANSLATIONS_DIR, `${locale}.json`);

  try {
    const fileContent = await fs.readFile(filePath, "utf-8");
    const translations: TranslationFile = JSON.parse(fileContent);
    return flattenTranslations(translations);
  } catch (error) {
    if ((error as any).code === "ENOENT") {
      console.log(`File ${filePath} not found, skipping...`);
      return [];
    }
    throw error;
  }
}

// Save translations to JSON file
async function saveTranslationsToFile(
  locale: string,
  translations: FlatTranslation[]
): Promise<void> {
  const filePath = path.join(TRANSLATIONS_DIR, `${locale}.json`);
  const nestedTranslations = createNestedObject(translations);

  // Ensure directory exists
  await fs.mkdir(TRANSLATIONS_DIR, { recursive: true });

  // Write file with pretty formatting
  await fs.writeFile(
    filePath,
    JSON.stringify(nestedTranslations, null, 2),
    "utf-8"
  );
  console.log(`✅ Saved ${translations.length} translations to ${filePath}`);
}

// Load translations from database
async function loadTranslationsFromDB(
  locale: string
): Promise<FlatTranslation[]> {
  const dbTranslations = await prisma.translation.findMany({
    where: { locale },
    select: { key: true, value: true, namespace: true },
  });

  return dbTranslations.map((t) => ({
    key: t.key,
    value: t.value,
    namespace: t.namespace,
  }));
}

// Save translations to database
async function saveTranslationsToDB(
  locale: string,
  translations: FlatTranslation[]
): Promise<void> {
  let created = 0;
  let updated = 0;

  for (const translation of translations) {
    const result = await prisma.translation.upsert({
      where: {
        key_locale_namespace: {
          key: translation.key,
          locale,
          namespace: translation.namespace,
        },
      },
      update: {
        value: translation.value,
        updatedAt: new Date(),
      },
      create: {
        key: translation.key,
        locale,
        value: translation.value,
        namespace: translation.namespace,
      },
    });

    // Check if it was created or updated (simplified check)
    const existing = await prisma.translation.findFirst({
      where: {
        key: translation.key,
        locale,
        namespace: translation.namespace,
        createdAt: { lt: new Date(Date.now() - 1000) }, // Created more than 1 second ago
      },
    });

    if (existing) {
      updated++;
    } else {
      created++;
    }
  }

  console.log(
    `✅ Database sync complete: ${created} created, ${updated} updated`
  );
}

// Upload: JSON files → Database
async function uploadToDatabase(
  locales: string[] = SUPPORTED_LOCALES
): Promise<void> {
  console.log("🔄 Uploading translations from JSON files to database...\n");

  for (const locale of locales) {
    console.log(`Processing locale: ${locale}`);

    const fileTranslations = await loadTranslationsFromFile(locale);
    if (fileTranslations.length === 0) {
      console.log(`No translations found for ${locale}, skipping...\n`);
      continue;
    }

    await saveTranslationsToDB(locale, fileTranslations);
    console.log(
      `Uploaded ${fileTranslations.length} translations for ${locale}\n`
    );
  }

  console.log("✅ Upload complete!");
}

// Download: Database → JSON files
async function downloadFromDatabase(
  locales: string[] = SUPPORTED_LOCALES
): Promise<void> {
  console.log("🔄 Downloading translations from database to JSON files...\n");

  for (const locale of locales) {
    console.log(`Processing locale: ${locale}`);

    const dbTranslations = await loadTranslationsFromDB(locale);
    if (dbTranslations.length === 0) {
      console.log(
        `No translations found in database for ${locale}, skipping...\n`
      );
      continue;
    }

    await saveTranslationsToFile(locale, dbTranslations);
    console.log(
      `Downloaded ${dbTranslations.length} translations for ${locale}\n`
    );
  }

  console.log("✅ Download complete!");
}

// Sync: Merge both directions
async function syncTranslations(
  locales: string[] = SUPPORTED_LOCALES
): Promise<void> {
  console.log("🔄 Syncing translations between JSON files and database...\n");

  for (const locale of locales) {
    console.log(`Processing locale: ${locale}`);

    const [fileTranslations, dbTranslations] = await Promise.all([
      loadTranslationsFromFile(locale),
      loadTranslationsFromDB(locale),
    ]);

    // Create maps for easy comparison
    const fileMap = new Map(
      fileTranslations.map((t) => [`${t.namespace}:${t.key}`, t])
    );
    const dbMap = new Map(
      dbTranslations.map((t) => [`${t.namespace}:${t.key}`, t])
    );

    // Find translations that exist in file but not in DB
    const toUpload: FlatTranslation[] = [];
    for (const [id, translation] of fileMap) {
      if (!dbMap.has(id) || dbMap.get(id)?.value !== translation.value) {
        toUpload.push(translation);
      }
    }

    // Find translations that exist in DB but not in file
    const toDownload: FlatTranslation[] = [];
    for (const [id, translation] of dbMap) {
      if (!fileMap.has(id)) {
        toDownload.push(translation);
      }
    }

    // Upload new/changed translations to database
    if (toUpload.length > 0) {
      console.log(`📤 Uploading ${toUpload.length} translations to database`);
      await saveTranslationsToDB(locale, toUpload);
    }

    // Download new translations from database
    if (toDownload.length > 0) {
      console.log(
        `📥 Downloading ${toDownload.length} new translations from database`
      );
      const allFileTranslations = [...fileTranslations, ...toDownload];
      await saveTranslationsToFile(locale, allFileTranslations);
    }

    if (toUpload.length === 0 && toDownload.length === 0) {
      console.log(`✅ ${locale} is already in sync`);
    }

    console.log("");
  }

  console.log("✅ Sync complete!");
}

// Compare translations and show differences
async function compareTranslations(
  locales: string[] = SUPPORTED_LOCALES
): Promise<void> {
  console.log("🔍 Comparing translations between JSON files and database...\n");

  for (const locale of locales) {
    console.log(`=== ${locale.toUpperCase()} ===`);

    const [fileTranslations, dbTranslations] = await Promise.all([
      loadTranslationsFromFile(locale),
      loadTranslationsFromDB(locale),
    ]);

    const fileMap = new Map(
      fileTranslations.map((t) => [`${t.namespace}:${t.key}`, t.value])
    );
    const dbMap = new Map(
      dbTranslations.map((t) => [`${t.namespace}:${t.key}`, t.value])
    );

    // Find differences
    const onlyInFile = [...fileMap.keys()].filter((key) => !dbMap.has(key));
    const onlyInDB = [...dbMap.keys()].filter((key) => !fileMap.has(key));
    const different = [...fileMap.keys()].filter(
      (key) => dbMap.has(key) && dbMap.get(key) !== fileMap.get(key)
    );

    console.log(`File: ${fileTranslations.length} translations`);
    console.log(`Database: ${dbTranslations.length} translations`);

    if (onlyInFile.length > 0) {
      console.log(`\n📄 Only in file (${onlyInFile.length}):`);
      onlyInFile.forEach((key) =>
        console.log(`  - ${key}: "${fileMap.get(key)}"`)
      );
    }

    if (onlyInDB.length > 0) {
      console.log(`\n🗄️  Only in database (${onlyInDB.length}):`);
      onlyInDB.forEach((key) => console.log(`  - ${key}: "${dbMap.get(key)}"`));
    }

    if (different.length > 0) {
      console.log(`\n⚠️  Different values (${different.length}):`);
      different.forEach((key) => {
        console.log(`  - ${key}:`);
        console.log(`    File: "${fileMap.get(key)}"`);
        console.log(`    DB:   "${dbMap.get(key)}"`);
      });
    }

    if (
      onlyInFile.length === 0 &&
      onlyInDB.length === 0 &&
      different.length === 0
    ) {
      console.log("✅ Perfect sync!");
    }

    console.log("");
  }
}

// CLI Setup
program
  .name("sync-translations")
  .description("Sync translations between JSON files and database")
  .version("1.0.0");

program
  .command("upload")
  .description("Upload translations from JSON files to database")
  .option(
    "-l, --locales <locales>",
    "Comma-separated list of locales",
    SUPPORTED_LOCALES.join(",")
  )
  .action(async (options) => {
    const locales = options.locales.split(",");
    await uploadToDatabase(locales);
    await prisma.$disconnect();
  });

program
  .command("download")
  .description("Download translations from database to JSON files")
  .option(
    "-l, --locales <locales>",
    "Comma-separated list of locales",
    SUPPORTED_LOCALES.join(",")
  )
  .action(async (options) => {
    const locales = options.locales.split(",");
    await downloadFromDatabase(locales);
    await prisma.$disconnect();
  });

program
  .command("sync")
  .description("Sync translations in both directions")
  .option(
    "-l, --locales <locales>",
    "Comma-separated list of locales",
    SUPPORTED_LOCALES.join(",")
  )
  .action(async (options) => {
    const locales = options.locales.split(",");
    await syncTranslations(locales);
    await prisma.$disconnect();
  });

program
  .command("compare")
  .description("Compare translations between JSON files and database")
  .option(
    "-l, --locales <locales>",
    "Comma-separated list of locales",
    SUPPORTED_LOCALES.join(",")
  )
  .action(async (options) => {
    const locales = options.locales.split(",");
    await compareTranslations(locales);
    await prisma.$disconnect();
  });

program
  .command("init")
  .description("Initialize translations directory with sample files")
  .action(async () => {
    await initializeTranslations();
    await prisma.$disconnect();
  });
// Initialize sample translation files
async function initializeTranslations(): Promise<void> {
  console.log("🔄 Initializing translation files...\n");

  const sampleTranslations = {
    en: {
      common: {
        welcome: "Welcome",
        goodbye: "Goodbye",
        hello: "Hello",
      },
      navigation: {
        home: "Home",
        about: "About",
        contact: "Contact",
      },
      buttons: {
        save: "Save",
        cancel: "Cancel",
        submit: "Submit",
      },
    },
    es: {
      common: {
        welcome: "Bienvenido",
        goodbye: "Adiós",
        hello: "Hola",
      },
      navigation: {
        home: "Inicio",
        about: "Acerca de",
        contact: "Contacto",
      },
      buttons: {
        save: "Guardar",
        cancel: "Cancelar",
        submit: "Enviar",
      },
    },
  };

  await fs.mkdir(TRANSLATIONS_DIR, { recursive: true });

  for (const [locale, translations] of Object.entries(sampleTranslations)) {
    const filePath = path.join(TRANSLATIONS_DIR, `${locale}.json`);
    await fs.writeFile(
      filePath,
      JSON.stringify(translations, null, 2),
      "utf-8"
    );
    console.log(`✅ Created ${filePath}`);
  }

  console.log("\n✅ Initialization complete!");
  console.log("\n📝 Next steps:");
  console.log("1. Edit the JSON files in the translations/ directory");
  console.log("2. Run: npm run sync:upload to upload to database");
  console.log("3. Use npm run sync:sync to keep everything in sync");
}

// Run the CLI
if (require.main === module) {
  program.parse();
}

export {
  compareTranslations,
  createNestedObject,
  downloadFromDatabase,
  flattenTranslations,
  syncTranslations,
  uploadToDatabase,
};

// package.json scripts (add these to your existing package.json)
/*
{
  "scripts": {
    "sync:upload": "tsx scripts/sync-translations.ts upload",
    "sync:download": "tsx scripts/sync-translations.ts download", 
    "sync:sync": "tsx scripts/sync-translations.ts sync",
    "sync:compare": "tsx scripts/sync-translations.ts compare",
    "sync:init": "tsx scripts/sync-translations.ts init",
    "sync:help": "tsx scripts/sync-translations.ts --help"
  },
  "dependencies": {
    "commander": "^11.0.0"
  }
}
*/

// Example translation file structure (translations/en.json)
/*
{
  "common": {
    "welcome": "Welcome",
    "goodbye": "Goodbye",
    "loading": "Loading...",
    "error": "An error occurred"
  },
  "navigation": {
    "home": "Home",
    "about": "About",
    "contact": "Contact Us",
    "products": "Products"
  },
  "forms": {
    "email": "Email Address",
    "password": "Password",
    "submit": "Submit",
    "cancel": "Cancel"
  },
  "messages": {
    "success": "Operation completed successfully",
    "error": "Something went wrong"
  }
}
*/

// Example translation file structure (translations/es.json)
/*
{
  "common": {
    "welcome": "Bienvenido",
    "goodbye": "Adiós",
    "loading": "Cargando...",
    "error": "Ocurrió un error"
  },
  "navigation": {
    "home": "Inicio",
    "about": "Acerca de",
    "contact": "Contáctanos",
    "products": "Productos"
  },
  "forms": {
    "email": "Correo Electrónico",
    "password": "Contraseña",
    "submit": "Enviar",
    "cancel": "Cancelar"
  },
  "messages": {
    "success": "Operación completada exitosamente",
    "error": "Algo salió mal"
  }
}
*/
