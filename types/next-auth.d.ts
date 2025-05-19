import { DefaultSession } from "next-auth";

declare module "next-auth" {
  /**
   * Estende il tipo User di next-auth con proprietà personalizzate
   */
  interface User {
    brand?: string;
    id: string;
  }

  /**
   * Restituisce il tipo Session di next-auth
   */
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      brand?: string;
    } & DefaultSession["user"];
  }
}
