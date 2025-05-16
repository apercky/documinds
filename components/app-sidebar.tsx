"use client";

import { PlusCircle, Settings2, SquareTerminal } from "lucide-react";
import { useSearchParams } from "next/navigation";
import type * as React from "react";
import { useEffect, useState } from "react";

import { Collection } from "@/types/collection";
import { NavUser } from "./nav-user";

import { usePathname, useRouter } from "@/app/i18n/routing";
import { Button } from "@/components/ui/button";
import { ErrorDialog } from "@/components/ui/error-dialog";
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
  const {
    checkPermission,
    isLoading: permissionsLoading,
    error,
  } = usePermissions();

  const canReadCollections = checkPermission(
    RESOURCES.COLLECTION,
    ACTIONS.READ
  );
  const canCreateCollections = checkPermission(
    RESOURCES.COLLECTION,
    ACTIONS.CREATE
  );

  if (process.env.NODE_ENV === "development") {
    console.log(
      `canReadCollections: ${canReadCollections} (loading: ${permissionsLoading})`
    );

    console.log(
      `canCreateCollections: ${canCreateCollections} (loading: ${permissionsLoading})`
    );
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
  const [collections, setCollections] = useState<Collection[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [isErrorDialogOpen, setIsErrorDialogOpen] = useState(false);
  const {
    checkPermission,
    isLoading: permissionsLoading,
    error: permissionsError,
  } = usePermissions();

  const userBrand = session?.user?.brand; // Attempt to get brand from session

  const canReadCollections = checkPermission("collections", "read");

  // Handle permissions error
  useEffect(() => {
    if (permissionsError) {
      let details = null;

      // Extract technical details from error
      if (
        permissionsError.cause &&
        typeof permissionsError.cause === "object" &&
        permissionsError.cause !== null
      ) {
        try {
          // Try to get response details
          const cause = permissionsError.cause as any;
          if (cause.response) {
            details = JSON.stringify(cause.response, null, 2);
          } else {
            details = JSON.stringify(cause, null, 2);
          }
        } catch (e) {
          console.error("Failed to stringify error cause:", e);
          details = String(permissionsError.cause);
        }
      }

      setError(permissionsError.message || "Permission error occurred");
      setErrorDetails(details);
      setIsErrorDialogOpen(true);
    }
  }, [permissionsError]);

  useEffect(() => {
    if (status === "authenticated" && userBrand && canReadCollections) {
      const fetchCollections = async () => {
        try {
          // Use userBrand from session
          const response = await fetch(
            `/api/store/collections?brand=${userBrand}`
          );

          if (!response.ok) {
            const errorText = await response.text();
            let errorJson = null;
            try {
              errorJson = JSON.parse(errorText);
            } catch (e) {
              // Ignore parsing error
            }

            throw new Error("Failed to fetch collections", {
              cause: {
                status: response.status,
                statusText: response.statusText,
                data: errorJson || errorText,
              },
            });
          }

          const collectionsData: Collection[] = await response.json();
          // Filter collections by user brand (potentially redundant if API does it, but safe)
          const filteredCollections = collectionsData.filter(
            (col) => col.metadata?.brand === userBrand
          );
          setCollections(filteredCollections);
          setError(null); // Clear previous errors
          setErrorDetails(null);
        } catch (err) {
          let errorMessage = "Failed to fetch collections";
          let details = null;

          if (err instanceof Error) {
            errorMessage = err.message;

            // Extract technical details from error
            if (err.cause && typeof err.cause === "object") {
              try {
                details = JSON.stringify(err.cause, null, 2);
              } catch (e) {
                details = String(err.cause);
              }
            }
          }

          setError(errorMessage);
          setErrorDetails(details);
          setIsErrorDialogOpen(true);
          console.error("Error fetching collections:", errorMessage);
          setCollections([]); // Clear collections on error
        }
      };
      fetchCollections();
    } else if (status === "authenticated" && !userBrand) {
      console.warn(
        "User session available, but user.brand is missing. Cannot fetch collections."
      );
      setError("User brand information is missing, cannot load collections.");
      setIsErrorDialogOpen(true);
      setCollections([]);
    } else if (status === "unauthenticated") {
      setCollections([]); // Clear collections if user is not authenticated
      setError(null); // Clear errors if any
      setErrorDetails(null);
    }
  }, [session, status, userBrand, canReadCollections]);

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

      {/* Error Dialog */}
      <ErrorDialog
        isOpen={isErrorDialogOpen}
        onOpenChange={setIsErrorDialogOpen}
        title="Application Error"
        message={error || "An unexpected error occurred"}
        details={errorDetails}
      />
    </>
  );
}
