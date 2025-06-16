import { prisma } from "@/lib/prisma";
import { readFileSync } from "fs";
import { join } from "path";

interface Messages {
  [key: string]: string | Messages;
}

function flattenMessages(
  messages: Messages,
  namespace: string = "common",
  prefix: string = ""
): Array<{ key: string; value: string; namespace: string }> {
  const result: Array<{ key: string; value: string; namespace: string }> = [];

  for (const [key, value] of Object.entries(messages)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (typeof value === "string") {
      result.push({
        key: fullKey,
        value,
        namespace,
      });
    } else if (typeof value === "object" && value !== null) {
      // If this is a top-level key and we're at the root, treat it as a namespace
      if (!prefix && typeof value === "object") {
        result.push(...flattenMessages(value, key, ""));
      } else {
        result.push(...flattenMessages(value, namespace, fullKey));
      }
    }
  }

  return result;
}

async function migrateTranslations() {
  try {
    console.log("Starting translation migration...");

    const locales = ["en", "it"];
    let totalMigrated = 0;

    for (const locale of locales) {
      console.log(`Processing ${locale} translations...`);

      try {
        const filePath = join(process.cwd(), "messages", `${locale}.json`);
        const fileContent = readFileSync(filePath, "utf-8");
        const messages: Messages = JSON.parse(fileContent);

        const flattenedMessages = flattenMessages(messages);
        console.log(
          `Found ${flattenedMessages.length} translations for ${locale}`
        );

        for (const { key, value, namespace } of flattenedMessages) {
          try {
            await prisma.translation.upsert({
              where: {
                key_locale_namespace: {
                  key,
                  locale,
                  namespace,
                },
              },
              update: {
                value,
                updatedAt: new Date(),
              },
              create: {
                key,
                locale,
                value,
                namespace,
              },
            });
            totalMigrated++;
          } catch (error) {
            console.error(
              `Failed to migrate ${namespace}.${key} for ${locale}:`,
              error
            );
          }
        }

        console.log(`Completed ${locale} translations`);
      } catch (error) {
        console.error(`Failed to process ${locale} translations:`, error);
      }
    }

    console.log(
      `Migration completed! Total translations migrated: ${totalMigrated}`
    );
  } catch (error) {
    console.error("Migration failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
migrateTranslations();
