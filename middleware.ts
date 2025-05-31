import { routing } from "@/app/i18n/routing";
import createMiddleware from "next-intl/middleware";

export default createMiddleware(routing);

export const config = {
  // Match all paths that should be internationalized
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
