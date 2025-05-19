import { StructuredPermissions } from "./permission";

export interface UserData {
  name: string;
  email: string;
  avatar: string;
  brand: string;
  permissions: StructuredPermissions;
}
