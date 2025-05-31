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
  checkPermission: (resource: string, action: string) => boolean,
  collectionChatMap: { [key: string]: string }
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

  // Get the current chatId from URL parameters
  const currentChatId = searchParams.get("chatId");

  if (process.env.NODE_ENV === "development") {
    console.log(`currentChatId: ${currentChatId}`);
    console.log(`currentCollection: ${currentCollection}`);
  }

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
            collectionChatMap[collection.name] || Date.now()
          }`,
          isActive: currentCollection === collection.name,
          disable: !canReadCollections,
          clearable: true,
          collectionName: collection.name,
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
  const { isMobile, setOpenMobile } = useSidebar();

  // Track previous pathname to detect route changes
  const [prevPathname, setPrevPathname] = useState(pathname);

  // Close sidebar on route change (only on mobile)
  useEffect(() => {
    if (isMobile && prevPathname !== pathname) {
      setOpenMobile(false);
    }
    setPrevPathname(pathname);
  }, [isMobile, setOpenMobile, pathname, prevPathname]);

  // Utilizziamo il nuovo hook useCollection per gestire le collezioni
  const { collections, isLoading: collectionsLoading } = useCollection();

  // Utilizziamo l'hook centralizzato per la gestione degli errori
  const { handleError, ErrorDialogComponent } = useErrorHandler();

  // Stato locale per tenere traccia del mapping tra collezioni e chatId
  const [collectionChatMap, setCollectionChatMap] = useState<{
    [key: string]: string;
  }>({});

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

  // Ottieni la collezione corrente dall'URL
  const currentCollection = searchParams.get("collection");
  // Ottieni il chatId corrente dall'URL
  const urlChatId = searchParams.get("chatId");

  // Effetto per aggiornare il mapping quando cambia la collection o la chatId nell'URL
  useEffect(() => {
    if (currentCollection && urlChatId) {
      setCollectionChatMap((prev) => ({
        ...prev,
        [currentCollection]: urlChatId,
      }));
    }
  }, [currentCollection, urlChatId]);

  // Funzione per ottenere la chatId per una collezione specifica
  const getChatIdForCollection = (collectionName: string): string => {
    // Se la collezione ha già una chatId nel mapping, usala
    if (collectionChatMap[collectionName]) {
      return collectionChatMap[collectionName];
    }
    // Altrimenti genera una nuova chatId
    return Date.now().toString();
  };

  const handleNewChat = () => {
    if (!currentCollection) {
      console.warn(
        "New Chat button clicked, but no collection is selected. Aborting."
      );
      return;
    }

    // Genera una nuova chatId
    const newChatId = Date.now().toString();

    // Aggiorna il mapping per questa collezione
    setCollectionChatMap((prev) => ({
      ...prev,
      [currentCollection]: newChatId,
    }));

    // Naviga alla nuova chat
    router.replace(
      `/dashboard?collection=${currentCollection}&chatId=${newChatId}`
    );
    router.refresh();
  };

  // Gestore per svuotare/ripristinare una chat
  const handleClearChat = (collectionName: string) => {
    // Genera una nuova chatId per questa collezione
    const newChatId = Date.now().toString();

    // Aggiorna il mapping
    setCollectionChatMap((prev) => ({
      ...prev,
      [collectionName]: newChatId,
    }));

    // Se stiamo cancellando la collezione corrente, naviga alla nuova chat
    if (collectionName === currentCollection) {
      router.replace(
        `/dashboard?collection=${collectionName}&chatId=${newChatId}`
      );
      router.refresh();
    }
  };

  const navData = createNavData(
    collections,
    pathname,
    currentCollection,
    locale,
    messages,
    searchParams,
    t,
    checkPermission,
    collectionChatMap // Passa il mapping al createNavData
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
          <NavMain items={navData.navMain} onClearChat={handleClearChat} />
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
