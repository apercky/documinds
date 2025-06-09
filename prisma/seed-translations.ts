import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const translations = [
    // Common translations
    { key: "welcome", locale: "en", value: "Welcome", namespace: "common" },
    { key: "welcome", locale: "it", value: "Benvenuto", namespace: "common" },
    { key: "goodbye", locale: "en", value: "Goodbye", namespace: "common" },
    { key: "goodbye", locale: "it", value: "Arrivederci", namespace: "common" },
    { key: "hello", locale: "en", value: "Hello", namespace: "common" },
    { key: "hello", locale: "it", value: "Ciao", namespace: "common" },
    { key: "thank_you", locale: "en", value: "Thank you", namespace: "common" },
    { key: "thank_you", locale: "it", value: "Grazie", namespace: "common" },

    // Navigation translations
    { key: "home", locale: "en", value: "Home", namespace: "navigation" },
    { key: "home", locale: "it", value: "Casa", namespace: "navigation" },
    { key: "about", locale: "en", value: "About", namespace: "navigation" },
    { key: "about", locale: "it", value: "Chi siamo", namespace: "navigation" },
    { key: "contact", locale: "en", value: "Contact", namespace: "navigation" },
    {
      key: "contact",
      locale: "it",
      value: "Contatti",
      namespace: "navigation",
    },
    {
      key: "services",
      locale: "en",
      value: "Services",
      namespace: "navigation",
    },
    {
      key: "services",
      locale: "it",
      value: "Servizi",
      namespace: "navigation",
    },

    // Form translations
    { key: "submit", locale: "en", value: "Submit", namespace: "forms" },
    { key: "submit", locale: "it", value: "Invia", namespace: "forms" },
    { key: "cancel", locale: "en", value: "Cancel", namespace: "forms" },
    { key: "cancel", locale: "it", value: "Annulla", namespace: "forms" },
    { key: "save", locale: "en", value: "Save", namespace: "forms" },
    { key: "save", locale: "it", value: "Salva", namespace: "forms" },
    { key: "delete", locale: "en", value: "Delete", namespace: "forms" },
    { key: "delete", locale: "it", value: "Elimina", namespace: "forms" },

    // Error messages
    {
      key: "error_generic",
      locale: "en",
      value: "An error occurred",
      namespace: "errors",
    },
    {
      key: "error_generic",
      locale: "it",
      value: "Si è verificato un errore",
      namespace: "errors",
    },
    {
      key: "error_not_found",
      locale: "en",
      value: "Not found",
      namespace: "errors",
    },
    {
      key: "error_not_found",
      locale: "it",
      value: "Non trovato",
      namespace: "errors",
    },
    {
      key: "error_unauthorized",
      locale: "en",
      value: "Unauthorized",
      namespace: "errors",
    },
    {
      key: "error_unauthorized",
      locale: "it",
      value: "Non autorizzato",
      namespace: "errors",
    },
  ];

  console.log("Seeding translations...");

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

  console.log("Translation seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
