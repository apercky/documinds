export const METADATA_KEYS = [
  { value: "brand", label: "brand" },
  { value: "category", label: "category" },
  { value: "display-name", label: "displayName" },
  { value: "display-key", label: "displayKey" },
] as const;

export const ROLES = {
  ADMIN: "dm_admin",
  EDITOR: "dm_editor",
  USER: "dm_user",
} as const;

export const RESOURCES = {
  COLLECTION: "collections",
} as const;

export const ACTIONS = {
  CREATE: "create",
  READ: "read",
  UPDATE: "update",
  DELETE: "delete",
} as const;
