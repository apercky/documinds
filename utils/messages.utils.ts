import { Collection } from "@/types/collection";
import { Attribute, AttributeType } from "@prisma/client";

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
 * Helper function to get collection display title with fallback chain:
 * 1. Look for a translation key in collection attributes with key "DISPLAY_KEY"
 * 2. If not found or translation not available, look for "DISPLAY_NAME" in attributes
 * 3. If not found, fall back to the collection.metadata["display-name"]
 * 4. Finally, use the collection.name as last resort
 *
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
  // Step 1: Try to find DISPLAY_KEY in attributes and use it for translation
  if (collection.attributes && Array.isArray(collection.attributes)) {
    const displayKeyAttr = collection.attributes.find(
      (attr: Attribute) => attr.type === AttributeType.DISPLAY_KEY && attr.value
    );

    if (displayKeyAttr?.value) {
      // Add prefix to the translation key if it doesn't already include it
      const fullKey = displayKeyAttr.value.includes(".")
        ? displayKeyAttr.value
        : `${prefix}.${displayKeyAttr.value}`;

      const translation = getNestedValue(messages, fullKey.split("."));
      if (translation) {
        return translation;
      }
    }

    // Step 2: Try to use DISPLAY_NAME attribute directly
    const displayNameAttr = collection.attributes.find(
      (attr: Attribute) =>
        attr.type === AttributeType.DISPLAY_NAME && attr.value
    );

    if (displayNameAttr?.value) {
      return displayNameAttr.value;
    }
  }

  // Step 3: Fall back to metadata if available
  // Legacy support for older format
  const displayKey = collection.metadata?.["display-key"] as string | undefined;
  if (displayKey) {
    const fullKey = displayKey.includes(".")
      ? displayKey
      : `${prefix}.${displayKey}`;
    const translation = getNestedValue(messages, fullKey.split("."));
    if (translation) {
      return translation;
    }
  }

  // Step 4: Try metadata display-name
  const metadataDisplayName = collection.metadata?.["display-name"] as string;
  if (metadataDisplayName) {
    return metadataDisplayName;
  }

  // Step 5: Final fallback to collection name
  return collection.name;
};
