import type {
  PermissionClaim,
  StructuredPermissions,
} from "@/types/permission";

export function groupPermissions(
  permissions: PermissionClaim[]
): StructuredPermissions {
  const result: StructuredPermissions = {};

  for (const perm of permissions) {
    if (!perm?.rsname) continue;

    if (!result[perm.rsname]) {
      result[perm.rsname] = [];
    }

    if (Array.isArray(perm.scopes)) {
      result[perm.rsname].push(...perm.scopes);
      // rimuovi duplicati
      result[perm.rsname] = [...new Set(result[perm.rsname])];
    }
  }

  return result;
}

export function hasPermission(
  permissions: StructuredPermissions | undefined,
  resource: string,
  scope: string
): boolean {
  return permissions?.[resource]?.includes(scope) ?? false;
}
