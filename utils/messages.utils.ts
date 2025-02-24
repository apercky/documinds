import { Collection } from "@/types/collection";

/**
 * Helper function to safely get nested value from messages
 */
export const getNestedValue = (
  obj: unknown,
  path: string[]
): string | undefined => {
  let current = obj;
  for (const key of path) {
    if (current && typeof current === "object" && key in current) {
      current = (current as Record<string, unknown>)[key];
    } else {
      return undefined;
    }
  }
  return typeof current === "string" ? current : undefined;
};

/**
 * Helper function to get collection display title with fallback chain
 * @param collection - The collection object
 * @param messages - The messages object containing translations
 * @param prefix - Optional prefix for the translation key (defaults to "collectionDisplay")
 * @returns The display title for the collection
 */
export const getCollectionTitle = (
  collection: Collection,
  messages: unknown,
  prefix: string = "collectionDisplay"
): string => {
  const displayKey = collection.metadata?.["display-key"] as string | undefined;
  if (displayKey) {
    // Add prefix to the translation key if it doesn't already include it
    const fullKey = displayKey.includes(".")
      ? displayKey
      : `${prefix}.${displayKey}`;
    const translation = getNestedValue(messages, fullKey.split("."));
    if (translation) {
      return translation;
    }
  }
  return (collection.metadata?.["display-name"] as string) || collection.name;
};
