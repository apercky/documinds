"use client";

import { PlusCircle, Settings2, SquareTerminal } from "lucide-react";
import { useSearchParams } from "next/navigation";
import type * as React from "react";
import { useEffect, useState } from "react";

import { Collection } from "@/types/collection";
import { NavUser } from "./nav-user";

import { usePathname, useRouter } from "@/app/i18n/routing";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { data } from "@/consts/mock-data";
import { cn } from "@/lib/utils";
import { getCollectionTitle } from "@/utils/messages.utils";
import { useLocale, useMessages, useTranslations } from "next-intl";
import Image from "next/image";
import Link from "next/link";
import { AnimatedText } from "./animated-text";
import { NavMain } from "./nav-main";
// Create navigation data with collections
const createNavData = (
  collections: Collection[],
  pathname: string,
  currentCollection: string | null,
  locale: string,
  messages: unknown,
  searchParams: URLSearchParams,
  t: (key: string) => string
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

  // Get the current chatId from URL parameters
  const currentChatId = searchParams.get("chatId");

  return {
    navMain: [
      {
        title: t("documentation"),
        url: "#",
        icon: SquareTerminal,
        isActive:
          isPathActive("/dashboard") ||
          (isSectionActive("/dashboard") && !pathname.includes("/dashboard/")),
        items: collections.map((collection) => ({
          title: getCollectionTitle(collection, messages),
          url: `/dashboard?collection=${collection.name}&chatId=${
            currentChatId || Date.now()
          }`,
          isActive: currentCollection === collection.name,
        })),
      },
      {
        title: t("settings"),
        url: "#",
        icon: Settings2,
        isActive: isSectionActive("/dashboard/admin"),
        items: [
          {
            title: t("general"),
            url: "/dashboard/admin",
            isActive: isPathActive("/dashboard/admin"),
          },
          {
            title: t("team"),
            url: "/dashboard/admin/team",
            isActive: isPathActive("/dashboard/admin/team"),
          },
          {
            title: t("billing"),
            url: "/dashboard/admin/billing",
            isActive: isPathActive("/dashboard/admin/billing"),
          },
          {
            title: t("limits"),
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
        priority
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
  const router = useRouter();
  const locale = useLocale();
  const messages = useMessages();
  const t = useTranslations("Navigation");
  const [collections, setCollections] = useState<Collection[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCollections = async () => {
      try {
        const response = await fetch(
          `/api/store/collections?brand=${data.user.brand}`
        );
        if (!response.ok) throw new Error("Failed to fetch collections");
        const collectionsData: Collection[] = await response.json();

        // Filter collections by user brand and transform to required format
        const filteredCollections = collectionsData.filter(
          (col) => col.metadata?.brand === data.user.brand
        );
        setCollections(filteredCollections);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to fetch collections";
        setError(errorMessage);
        console.error("Error fetching collections:", errorMessage);
      }
    };

    fetchCollections();
  }, []);

  // If there's an error, you might want to show it or handle it appropriately
  if (error) {
    console.warn("Collections loading error:", error);
  }

  const currentCollection =
    searchParams.get("collection") ||
    (collections.length > 0 ? collections[0].name : null);

  const handleNewChat = () => {
    if (!currentCollection) {
      console.warn(
        "New Chat button clicked, but no collection is selected. Aborting."
      );
      // Optionally, you could show a user-facing notification here
      return;
    }
    router.replace(
      `/dashboard?collection=${currentCollection}&chatId=${Date.now()}`
    );
    router.refresh();
  };

  const navData = createNavData(
    collections,
    pathname,
    currentCollection,
    locale,
    messages,
    searchParams,
    t
  );

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarLogo />
      </SidebarHeader>
      <SidebarContent>
        <div className="flex justify-end items-center px-4 mb-2 mt-4">
          <Button
            onClick={handleNewChat}
            disabled={!currentCollection}
            className="max-w-[80%] gap-2 bg-gradient-to-r from-primary/90 to-primary hover:from-primary hover:to-primary/90 shadow-sm"
            size="sm"
          >
            <PlusCircle className="h-4 w-4" />
            <span className="font-medium">{t("newChat")}</span>
          </Button>
        </div>
        <NavMain items={navData.navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
