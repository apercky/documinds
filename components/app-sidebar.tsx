"use client";

import { PlusCircle, Settings2, SquareTerminal } from "lucide-react";
import { useSearchParams } from "next/navigation";
import type * as React from "react";
import { useEffect } from "react";

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
import { ACTIONS, RESOURCES } from "@/consts/consts";
import { usePermissions } from "@/hooks/auth/use-permissions";
import { useCollection } from "@/hooks/use-collection";
import { useErrorHandler } from "@/hooks/use-error-handler";
import { cn } from "@/lib/utils";
import { getCollectionTitle } from "@/utils/messages.utils";
import { useSession } from "next-auth/react";
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
  t: (key: string) => string,
  checkPermission: (resource: string, action: string) => boolean
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

  const canReadCollections = checkPermission(
    RESOURCES.COLLECTION,
    ACTIONS.READ
  );
  const canCreateCollections = checkPermission(
    RESOURCES.COLLECTION,
    ACTIONS.CREATE
  );

  if (process.env.NODE_ENV === "development") {
    console.log(`canReadCollections: ${canReadCollections}`);
    console.log(`canCreateCollections: ${canCreateCollections}`);
  }

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
          disable: !canReadCollections,
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
            disable: !canCreateCollections,
          },
          {
            title: t("team"),
            url: "/dashboard/admin/team",
            isActive: isPathActive("/dashboard/admin/team"),
            disable: !canCreateCollections,
          },
          {
            title: t("billing"),
            url: "/dashboard/admin/billing",
            isActive: isPathActive("/dashboard/admin/billing"),
            disable: !canCreateCollections,
          },
          {
            title: t("limits"),
            url: "/dashboard/admin/limits",
            isActive: isPathActive("/dashboard/admin/limits"),
            disable: !canCreateCollections,
          },
        ],
      },
    ],
  };
};

function SidebarLogo() {
  const { state } = useSidebar();

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
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const locale = useLocale();
  const messages = useMessages();
  const t = useTranslations("Navigation");

  // Utilizziamo il nuovo hook useCollection per gestire le collezioni
  const { collections, isLoading: collectionsLoading } = useCollection();

  // Utilizziamo l'hook centralizzato per la gestione degli errori
  const { handleError, ErrorDialogComponent } = useErrorHandler();

  const {
    checkPermission,
    isLoading: permissionsLoading,
    error: permissionsError,
  } = usePermissions();

  // Handle permissions error con il nostro handler centralizzato
  useEffect(() => {
    if (permissionsError) {
      console.error("Permission error detected:", permissionsError);

      // Verifichiamo se è un errore di autenticazione (401)
      const err = permissionsError as Error;
      const cause = (err.cause as any) || {};

      // Log dettagliato dell'errore per debug
      console.log("Error cause:", cause);

      // Passiamo l'errore all'handler centralizzato
      handleError(permissionsError);
    }
  }, [permissionsError]); // Non includiamo handleError per evitare cicli

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
    t,
    checkPermission
  );

  return (
    <>
      <Sidebar collapsible="icon" {...props}>
        <SidebarHeader>
          <SidebarLogo />
        </SidebarHeader>
        <SidebarContent>
          <div className="flex justify-end items-center px-4 mb-2 mt-4">
            <Button
              onClick={handleNewChat}
              disabled={!currentCollection || status !== "authenticated"}
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
          <NavUser user={session?.user} isLoading={status === "loading"} />
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      {/* Utilizziamo il componente dialog fornito dall'hook */}
      <ErrorDialogComponent />
    </>
  );
}
