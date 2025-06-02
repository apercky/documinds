"use client";

import { Link } from "@/app/i18n/routing";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuthUtils } from "@/hooks/auth/use-auth-utils";
import { cn, getInitials } from "@/lib/utils";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";

export function UserNav() {
  const t = useTranslations("UserNav");
  const { data: session } = useSession();
  const { logout } = useAuthUtils();
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

  const handleLogout = async () => {
    await logout();
  };

  if (!session || !session.user) {
    return null;
  }

  const { user } = session;
  const userName = user.name ?? "User";
  const userEmail = user.email ?? "";
  const userAvatar = user.image ?? undefined;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            "relative rounded-full",
            isMobile ? "h-10 w-10" : "h-8 w-8"
          )}
        >
          <Avatar className={cn(isMobile ? "h-10 w-10" : "h-8 w-8")}>
            <AvatarImage src={userAvatar} alt={userName} />
            <AvatarFallback>{getInitials(userName)}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className={cn("font-normal", isMobile && "py-2.5")}>
          <div className="flex flex-col space-y-1">
            <p
              className={cn(
                "text-sm font-medium leading-none",
                isMobile && "text-base"
              )}
            >
              {userName}
            </p>
            <p
              className={cn(
                "text-xs leading-none text-muted-foreground",
                isMobile && "text-sm"
              )}
            >
              {userEmail}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem
            asChild
            className={isMobile ? "mobile-touch-target mobile-text" : ""}
          >
            <Link href="/profile">{t("profile")}</Link>
          </DropdownMenuItem>
          <DropdownMenuItem
            asChild
            className={isMobile ? "mobile-touch-target mobile-text" : ""}
          >
            <Link href="/billing">{t("billing")}</Link>
          </DropdownMenuItem>
          <DropdownMenuItem
            asChild
            className={isMobile ? "mobile-touch-target mobile-text" : ""}
          >
            <Link href="/settings">{t("settings")}</Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className={cn(
            "cursor-pointer text-red-600 focus:text-red-600",
            isMobile && "mobile-touch-target mobile-text"
          )}
          onClick={handleLogout}
        >
          {t("logout")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
