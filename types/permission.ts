export type PermissionClaim = {
  rsname: string;
  scopes: string[];
};

export type StructuredPermissions = {
  [resource: string]: string[];
};
