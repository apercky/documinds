"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuthUtils } from "@/hooks/auth/use-auth-utils";
import { cn, getInitials } from "@/lib/utils";
import {
  BadgeCheck,
  Bell,
  ChevronsUpDown,
  CreditCard,
  LogOut,
  Sparkles,
} from "lucide-react";
import type { User } from "next-auth";

interface NavUserProps {
  user: User | null | undefined;
  isLoading: boolean;
}

export function NavUser({ user, isLoading }: NavUserProps) {
  const { isMobile } = useSidebar();
  const { logout } = useAuthUtils();

  const handleLogout = async () => {
    await logout();
  };

  if (isLoading) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size="lg" className="animate-pulse">
            <div className="h-8 w-8 rounded-full bg-muted"></div>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="h-4 w-20 rounded bg-muted"></span>
              <span className="mt-1 h-3 w-24 rounded bg-muted"></span>
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  if (!user) {
    return null;
  }

  const userName = user.name ?? "User";
  const userEmail = user.email ?? "";
  const userAvatar = user.image ?? undefined;

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className={cn(
                "data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground",
                isMobile && "mobile-touch-target"
              )}
            >
              <Avatar className={cn("h-8 w-8", isMobile && "h-9 w-9")}>
                <AvatarImage src={userAvatar} alt={userName} />
                <AvatarFallback>{getInitials(userName)}</AvatarFallback>
              </Avatar>
              <div
                className={cn(
                  "grid flex-1 text-left text-sm leading-tight",
                  isMobile && "text-base"
                )}
              >
                <span className="truncate font-semibold">{userName}</span>
                <span className={cn("truncate text-xs", isMobile && "text-sm")}>
                  {userEmail}
                </span>
              </div>
              <ChevronsUpDown
                className={cn("ml-auto size-4", isMobile && "size-5")}
              />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div
                className={cn(
                  "flex items-center gap-2 px-1 py-1.5 text-left text-sm",
                  isMobile && "py-2.5 text-base"
                )}
              >
                <Avatar className={cn("h-8 w-8", isMobile && "h-9 w-9")}>
                  <AvatarImage src={userAvatar} alt={userName} />
                  <AvatarFallback>{getInitials(userName)}</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">{userName}</span>
                  <span
                    className={cn("truncate text-xs", isMobile && "text-sm")}
                  >
                    {userEmail}
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem
                className={isMobile ? "mobile-touch-target mobile-text" : ""}
              >
                <Sparkles
                  className={cn("mr-2 h-4 w-4", isMobile && "h-5 w-5")}
                />
                Upgrade to Pro
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem
                className={isMobile ? "mobile-touch-target mobile-text" : ""}
              >
                <BadgeCheck
                  className={cn("mr-2 h-4 w-4", isMobile && "h-5 w-5")}
                />
                Account
              </DropdownMenuItem>
              <DropdownMenuItem
                className={isMobile ? "mobile-touch-target mobile-text" : ""}
              >
                <CreditCard
                  className={cn("mr-2 h-4 w-4", isMobile && "h-5 w-5")}
                />
                Billing
              </DropdownMenuItem>
              <DropdownMenuItem
                className={isMobile ? "mobile-touch-target mobile-text" : ""}
              >
                <Bell className={cn("mr-2 h-4 w-4", isMobile && "h-5 w-5")} />
                Notifications
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              className={isMobile ? "mobile-touch-target mobile-text" : ""}
            >
              <LogOut className={cn("mr-2 h-4 w-4", isMobile && "h-5 w-5")} />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
