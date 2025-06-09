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
const SUPPORTED_LOCALES = locales;

// Convert JSON structure to flat database format
function flattenJSON(obj: TranslationFile): FlatTranslation[] {
  const result: FlatTranslation[] = [];

  // Each top-level key becomes a namespace
  for (const [namespace, namespaceContent] of Object.entries(obj)) {
    if (typeof namespaceContent === "string") {
      // Top-level string (rare case)
      result.push({
        namespace: "common",
        key: namespace,
        value: namespaceContent,
      });
    } else {
      // Flatten everything under this namespace
      flattenObject(namespaceContent, "", namespace, result);
    }
  }

  return result;
}

// Recursively flatten an object into dot-separated keys
function flattenObject(
  obj: TranslationFile,
  prefix: string,
  namespace: string,
  result: FlatTranslation[]
): void {
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (typeof value === "string") {
      result.push({
        namespace,
        key: fullKey,
        value,
      });
    } else {
      // Recurse for nested objects
      flattenObject(value, fullKey, namespace, result);
    }
  }
}

// Convert flat database format back to JSON structure
function buildJSON(translations: FlatTranslation[]): TranslationFile {
  const result: TranslationFile = {};

  for (const { namespace, key, value } of translations) {
    // Create namespace if it doesn't exist
    if (!result[namespace]) {
      result[namespace] = {};
    }

    // Navigate/create the nested structure
    const keys = key.split(".");
    let current = result[namespace] as TranslationFile;

    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) {
        current[keys[i]] = {};
      }
      current = current[keys[i]] as TranslationFile;
    }

    // Set the final value
    current[keys[keys.length - 1]] = value;
  }

  return result;
}

// Load translations from JSON file
async function loadFromFile(locale: string): Promise<FlatTranslation[]> {
  const filePath = path.join(TRANSLATIONS_DIR, `${locale}.json`);

  try {
    const content = await fs.readFile(filePath, "utf-8");
    const json: TranslationFile = JSON.parse(content);
    return flattenJSON(json);
  } catch (error) {
    if ((error as any).code === "ENOENT") {
      console.log(`File ${filePath} not found, skipping...`);
      return [];
    }
    throw error;
  }
}

// Save translations to JSON file
async function saveToFile(
  locale: string,
  translations: FlatTranslation[]
): Promise<void> {
  const filePath = path.join(TRANSLATIONS_DIR, `${locale}.json`);
  const json = buildJSON(translations);

  await fs.mkdir(TRANSLATIONS_DIR, { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(json, null, 2), "utf-8");
  console.log(`✅ Saved ${translations.length} translations to ${filePath}`);
}

// Load translations from database
async function loadFromDB(locale: string): Promise<FlatTranslation[]> {
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
async function saveToDB(
  locale: string,
  translations: FlatTranslation[]
): Promise<void> {
  let created = 0;
  let updated = 0;

  for (const translation of translations) {
    const existing = await prisma.translation.findUnique({
      where: {
        key_locale_namespace: {
          key: translation.key,
          locale,
          namespace: translation.namespace,
        },
      },
    });

    if (existing) {
      if (existing.value !== translation.value) {
        await prisma.translation.update({
          where: { id: existing.id },
          data: {
            value: translation.value,
            updatedAt: new Date(),
          },
        });
        updated++;
      }
    } else {
      await prisma.translation.create({
        data: {
          key: translation.key,
          locale,
          value: translation.value,
          namespace: translation.namespace,
        },
      });
      created++;
    }
  }

  console.log(
    `✅ Database sync complete: ${created} created, ${updated} updated`
  );
}

// COMMAND FUNCTIONS

async function uploadToDatabase(
  locales: string[] = SUPPORTED_LOCALES
): Promise<void> {
  console.log("🔄 Uploading translations from JSON files to database...\n");

  for (const locale of locales) {
    console.log(`Processing locale: ${locale}`);

    const fileTranslations = await loadFromFile(locale);
    if (fileTranslations.length === 0) {
      console.log(`No translations found for ${locale}, skipping...\n`);
      continue;
    }

    await saveToDB(locale, fileTranslations);
    console.log(
      `Uploaded ${fileTranslations.length} translations for ${locale}\n`
    );
  }

  console.log("✅ Upload complete!");
}

async function downloadFromDatabase(
  locales: string[] = SUPPORTED_LOCALES
): Promise<void> {
  console.log("🔄 Downloading translations from database to JSON files...\n");

  for (const locale of locales) {
    console.log(`Processing locale: ${locale}`);

    const dbTranslations = await loadFromDB(locale);
    if (dbTranslations.length === 0) {
      console.log(
        `No translations found in database for ${locale}, skipping...\n`
      );
      continue;
    }

    await saveToFile(locale, dbTranslations);
    console.log(
      `Downloaded ${dbTranslations.length} translations for ${locale}\n`
    );
  }

  console.log("✅ Download complete!");
}

async function syncTranslations(
  locales: string[] = SUPPORTED_LOCALES
): Promise<void> {
  console.log("🔄 Syncing translations between JSON files and database...\n");

  for (const locale of locales) {
    console.log(`Processing locale: ${locale}`);

    const [fileTranslations, dbTranslations] = await Promise.all([
      loadFromFile(locale),
      loadFromDB(locale),
    ]);

    // Create maps for comparison
    const fileMap = new Map(
      fileTranslations.map((t) => [`${t.namespace}:${t.key}`, t])
    );
    const dbMap = new Map(
      dbTranslations.map((t) => [`${t.namespace}:${t.key}`, t])
    );

    // Find translations to upload (new or changed in file)
    const toUpload: FlatTranslation[] = [];
    for (const [id, translation] of fileMap) {
      const dbTranslation = dbMap.get(id);
      if (!dbTranslation || dbTranslation.value !== translation.value) {
        toUpload.push(translation);
      }
    }

    // Find translations to download (new in DB)
    const toDownload: FlatTranslation[] = [];
    for (const [id, translation] of dbMap) {
      if (!fileMap.has(id)) {
        toDownload.push(translation);
      }
    }

    // Sync changes
    if (toUpload.length > 0) {
      console.log(`📤 Uploading ${toUpload.length} translations to database`);
      await saveToDB(locale, toUpload);
    }

    if (toDownload.length > 0) {
      console.log(
        `📥 Downloading ${toDownload.length} new translations from database`
      );
      const allFileTranslations = [...fileTranslations, ...toDownload];
      await saveToFile(locale, allFileTranslations);
    }

    if (toUpload.length === 0 && toDownload.length === 0) {
      console.log(`✅ ${locale} is already in sync`);
    }

    console.log("");
  }

  console.log("✅ Sync complete!");
}

async function compareTranslations(
  locales: string[] = SUPPORTED_LOCALES
): Promise<void> {
  console.log("🔍 Comparing translations between JSON files and database...\n");

  for (const locale of locales) {
    console.log(`=== ${locale.toUpperCase()} ===`);

    const [fileTranslations, dbTranslations] = await Promise.all([
      loadFromFile(locale),
      loadFromDB(locale),
    ]);

    const fileMap = new Map(
      fileTranslations.map((t) => [`${t.namespace}:${t.key}`, t.value])
    );
    const dbMap = new Map(
      dbTranslations.map((t) => [`${t.namespace}:${t.key}`, t.value])
    );

    const onlyInFile = [...fileMap.keys()].filter((key) => !dbMap.has(key));
    const onlyInDB = [...dbMap.keys()].filter((key) => !fileMap.has(key));
    const different = [...fileMap.keys()].filter(
      (key) => dbMap.has(key) && dbMap.get(key) !== fileMap.get(key)
    );

    console.log(`File: ${fileTranslations.length} translations`);
    console.log(`Database: ${dbTranslations.length} translations`);

    if (onlyInFile.length > 0) {
      console.log(`\n📄 Only in file (${onlyInFile.length}):`);
      onlyInFile
        .slice(0, 10)
        .forEach((key) =>
          console.log(`  - ${key}: "${fileMap.get(key)?.substring(0, 50)}..."`)
        );
      if (onlyInFile.length > 10)
        console.log(`  ... and ${onlyInFile.length - 10} more`);
    }

    if (onlyInDB.length > 0) {
      console.log(`\n🗄️  Only in database (${onlyInDB.length}):`);
      onlyInDB
        .slice(0, 10)
        .forEach((key) =>
          console.log(`  - ${key}: "${dbMap.get(key)?.substring(0, 50)}..."`)
        );
      if (onlyInDB.length > 10)
        console.log(`  ... and ${onlyInDB.length - 10} more`);
    }

    if (different.length > 0) {
      console.log(`\n⚠️  Different values (${different.length}):`);
      different.slice(0, 5).forEach((key) => {
        console.log(`  - ${key}:`);
        console.log(`    File: "${fileMap.get(key)?.substring(0, 30)}..."`);
        console.log(`    DB:   "${dbMap.get(key)?.substring(0, 30)}..."`);
      });
      if (different.length > 5)
        console.log(`  ... and ${different.length - 5} more`);
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
    },
    it: {
      common: {
        welcome: "Benvenuto",
        goodbye: "Arrivederci",
        hello: "Ciao",
      },
      navigation: {
        home: "Home",
        about: "Informazioni",
        contact: "Contatti",
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
}

async function generateSeedFile(
  locales: string[] = SUPPORTED_LOCALES
): Promise<void> {
  console.log("🔄 Generating seed file from database translations...\n");

  // Get all translations from database
  const allTranslations = await prisma.translation.findMany({
    where: {
      locale: {
        in: locales,
      },
    },
    select: {
      key: true,
      locale: true,
      value: true,
      namespace: true,
    },
    orderBy: [{ namespace: "asc" }, { locale: "asc" }, { key: "asc" }],
  });

  if (allTranslations.length === 0) {
    console.log("No translations found in database.");
    return;
  }

  // Generate the seed file content
  const seedContent = `import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function seedTranslations() {
  console.log("📄 Setting up translations...");
  
  const translations = [
${allTranslations
  .map((t) => {
    const escapedValue = t.value
      .replace(/\\/g, "\\\\")
      .replace(/"/g, '\\"')
      .replace(/\n/g, "\\n");
    return `    { key: "${t.key}", locale: "${t.locale}", value: "${escapedValue}", namespace: "${t.namespace}" },`;
  })
  .join("\n")}
  ];

  console.log("📄 Seeding translations...");

  for (const translation of translations) {
    await prisma.translation.upsert({
      where: {
        key_locale_namespace: {
          key: translation.key,
          locale: translation.locale,
          namespace: translation.namespace,
        },
      },
      update: {
        value: translation.value,
      },
      create: translation,
    });
  }

  console.log("📄 Translation seeding completed successfully!");
}

`;

  // Write the seed file
  const seedFilePath = path.join("prisma", "seeds", "seed-translations.ts");
  await fs.writeFile(seedFilePath, seedContent, "utf-8");

  console.log(`✅ Generated seed file: ${seedFilePath}`);
  console.log(`📊 Included ${allTranslations.length} translations`);

  // Show summary by locale and namespace
  const summary = allTranslations.reduce((acc, t) => {
    const key = `${t.locale}:${t.namespace}`;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  console.log("\n📋 Summary:");
  Object.entries(summary)
    .sort()
    .forEach(([key, count]) => {
      const [locale, namespace] = key.split(":");
      console.log(`  ${locale} (${namespace}): ${count} translations`);
    });

  console.log("\n✅ Seed generation complete!");
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

program
  .command("generate-seed")
  .description("Generate a seed file from database translations")
  .option(
    "-l, --locales <locales>",
    "Comma-separated list of locales",
    SUPPORTED_LOCALES.join(",")
  )
  .action(async (options) => {
    const locales = options.locales.split(",");
    await generateSeedFile(locales);
    await prisma.$disconnect();
  });

// Run the CLI
if (require.main === module) {
  program.parse();
}

export {
  buildJSON,
  compareTranslations,
  downloadFromDatabase,
  flattenJSON,
  generateSeedFile,
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
    "sync:generate-seed": "tsx scripts/sync-translations.ts generate-seed",
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
