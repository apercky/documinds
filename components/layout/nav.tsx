"use client";

import { Link, usePathname } from "@/app/i18n/routing";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  ChevronRight,
  LayoutDashboard,
  Menu,
  Settings,
  Users,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

interface NavItem {
  title: string;
  href: string;
  icon: React.ReactNode;
}

export function Nav() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname();
  const t = useTranslations("Navigation");

  const navItems: NavItem[] = [
    {
      title: t("dashboard"),
      href: "/dashboard",
      icon: <LayoutDashboard className="h-4 w-4" />,
    },
    {
      title: t("users"),
      href: "/users",
      icon: <Users className="h-4 w-4" />,
    },
    {
      title: t("settings"),
      href: "/settings",
      icon: <Settings className="h-4 w-4" />,
    },
  ];

  return (
    <div className="relative">
      <div className="absolute right-[-20px] top-0">
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => setIsCollapsed(!isCollapsed)}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <ChevronRight
            className={cn("h-4 w-4 transition-transform", {
              "rotate-180": isCollapsed,
            })}
          />
        </Button>
      </div>
      <ScrollArea className="h-full py-2">
        <div
          className={cn("flex flex-col gap-2 transition-all duration-200", {
            "items-center": isCollapsed,
          })}
        >
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setIsCollapsed(!isCollapsed)}
          >
            <Menu className="h-4 w-4" />
            <span className="sr-only">Toggle navigation</span>
          </Button>
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                {
                  "bg-accent": pathname === item.href,
                  "justify-center": isCollapsed,
                }
              )}
            >
              {item.icon}
              {!isCollapsed && <span>{item.title}</span>}
            </Link>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
