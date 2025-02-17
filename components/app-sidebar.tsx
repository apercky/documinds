"use client";

import { BookOpen, Settings2, SquareTerminal } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import type * as React from "react";

import { NavUser } from "./nav-user";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { useLocale } from "next-intl";
import Image from "next/image";
import Link from "next/link";
import { AnimatedText } from "./animated-text";
import { NavMain } from "./nav-main";

// This is sample data.
const data = {
  user: {
    name: "Antonio Perchinumio",
    email: "antonio_perchinumio@otb.net",
    avatar: "/avatars/shadcn.jpg",
  },
  collections: [
    {
      title: "OneStore",
      id: "onestore",
    },
    {
      title: "RBO",
      id: "rbo",
    },
    {
      title: "Clienteling",
      id: "clienteling",
    },
  ],
};

// Create navigation data with collections
const createNavData = (
  collections: typeof data.collections,
  pathname: string,
  currentCollection: string | null,
  locale: string
) => {
  // Helper function to check if a path matches the current pathname
  const isPathActive = (path: string) => {
    const localePath = `/${locale}${path}`;
    return pathname === localePath;
  };

  // Helper function to check if a section is active
  const isSectionActive = (path: string) => {
    const localePath = `/${locale}${path}`;
    return pathname.startsWith(localePath);
  };

  return {
    navMain: [
      {
        title: "Collections",
        url: "#",
        icon: SquareTerminal,
        isActive:
          isPathActive("/dashboard") ||
          (isSectionActive("/dashboard") && !pathname.includes("/dashboard/")),
        items: collections.map((collection) => ({
          title: collection.title,
          url: `/dashboard?collection=${collection.id}`,
          isActive: currentCollection === collection.id,
        })),
      },
      {
        title: "Documentation",
        url: "#",
        icon: BookOpen,
        isActive:
          isSectionActive("/dashboard/") && !pathname.includes("/admin"),
        items: [
          {
            title: "Introduction",
            url: "/dashboard/introduction",
            isActive: isPathActive("/dashboard/introduction"),
          },
          {
            title: "Get Started",
            url: "/dashboard/get-started",
            isActive: isPathActive("/dashboard/get-started"),
          },
          {
            title: "Tutorials",
            url: "/dashboard/tutorials",
            isActive: isPathActive("/dashboard/tutorials"),
          },
          {
            title: "Changelog",
            url: "/dashboard/changelog",
            isActive: isPathActive("/dashboard/changelog"),
          },
        ],
      },
      {
        title: "Settings",
        url: "#",
        icon: Settings2,
        isActive: isSectionActive("/dashboard/admin"),
        items: [
          {
            title: "General",
            url: "/dashboard/admin",
            isActive: isPathActive("/dashboard/admin"),
          },
          {
            title: "Team",
            url: "/dashboard/admin/team",
            isActive: isPathActive("/dashboard/admin/team"),
          },
          {
            title: "Billing",
            url: "/dashboard/admin/billing",
            isActive: isPathActive("/dashboard/admin/billing"),
          },
          {
            title: "Limits",
            url: "/dashboard/admin/limits",
            isActive: isPathActive("/dashboard/admin/limits"),
          },
        ],
      },
    ],
  };
};

function SidebarLogo() {
  const { state } = useSidebar();
  const locale = useLocale();

  return (
    <Link
      href="/"
      locale={locale}
      className={cn(
        "flex items-center group",
        state === "expanded" ? "mr-6 space-x-2" : "justify-center w-full"
      )}
    >
      <Image
        src="/logo.svg"
        alt="Logo"
        className="h-12 w-12 dark:invert"
        width={48}
        height={48}
      />
      {state === "expanded" && (
        <AnimatedText text="DOCUMINDS" className="text-1xl pl-2" />
      )}
    </Link>
  );
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const currentCollection =
    searchParams.get("collection") || data.collections[0].id;
  const locale = useLocale();

  const navData = createNavData(
    data.collections,
    pathname,
    currentCollection,
    locale
  );

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarLogo />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navData.navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
