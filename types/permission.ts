export type PermissionClaim = {
  rsname: string;
  scopes: string[];
  rsid?: string;
};

export type StructuredPermissions = {
  [resource: string]: string[];
};
