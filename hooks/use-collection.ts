"use client";

import { ROLES } from "@/consts/consts";
import { usePermissions } from "@/hooks/auth/use-permissions";

import { Collection } from "@prisma/client";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";
import { useErrorHandler } from "./use-error-handler";

/**
 * Hook to retrieve and manage collections for a user
 * @param options Configuration options
 * @param options.useAdminMode If true, attempts to use admin endpoint for ADMIN users, or regular endpoint with brand filter for EDITOR users
 */
export function useCollection({
  useAdminMode = false,
}: { useAdminMode?: boolean } = {}) {
  const { data: session, status } = useSession();
  const userBrand = session?.user?.brand;
  const [collections, setCollections] = useState<Collection[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Using the centralized error handling hook
  const { handleError } = useErrorHandler();

  // Using the permissions hook to check roles, with safe fallback
  const {
    hasRole,
    isLoading: permissionsLoading,
    error: permissionsError,
  } = usePermissions();

  // Determine user roles - default to false if permissions are still loading or failed
  const isAdmin =
    !permissionsLoading && !permissionsError ? hasRole(ROLES.ADMIN) : false;
  const isEditor =
    !permissionsLoading && !permissionsError ? hasRole(ROLES.EDITOR) : false;

  // Define access mode based on roles and requested mode
  const useAdminEndpoint = useAdminMode && isAdmin;

  // Function to fetch collections
  const fetchCollections = useCallback(async () => {
    if (status !== "authenticated") {
      setCollections([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      // Choose endpoint based on access level
      const url = useAdminEndpoint
        ? `/api/store/collections/admin`
        : `/api/store/collections?brand=${userBrand}`;

      const response = await fetch(url);

      if (!response.ok) {
        const errorText = await response.text();
        let errorJson = null;
        try {
          errorJson = JSON.parse(errorText);
        } catch (e) {
          // Ignore parsing error
        }

        // Create a more detailed error object
        const error = new Error("Failed to fetch collections", {
          cause: {
            status: response.status,
            statusText: response.statusText,
            data: errorJson || errorText,
          },
        });

        throw error;
      }

      const collectionsData: Collection[] = await response.json();
      setCollections(collectionsData);
    } catch (err) {
      console.error("Error fetching collections:", err);
      // Only handle this error, not permission errors
      handleError(err);
      setCollections([]);
    } finally {
      setIsLoading(false);
    }
  }, [status, useAdminEndpoint, userBrand, handleError]);

  // Fetch collections on mount and when dependencies change
  useEffect(() => {
    // Only fetch if authenticated AND (not in admin mode OR permissions are loaded OR there was an error loading permissions)
    if (
      status === "authenticated" &&
      (!useAdminMode || !permissionsLoading || !!permissionsError)
    ) {
      fetchCollections();
    }
  }, [
    status,
    useAdminEndpoint,
    userBrand,
    permissionsLoading,
    permissionsError,
    useAdminMode,
    fetchCollections,
  ]);

  // Function to update a specific collection in the state
  const updateCollectionInCache = (
    collectionName: string,
    updates: Partial<Collection>
  ) => {
    setCollections((currentCollections) =>
      currentCollections.map((collection) =>
        collection.name === collectionName
          ? { ...collection, ...updates }
          : collection
      )
    );
  };

  // Return data and functions along with role information
  return {
    collections,
    isLoading: isLoading || (useAdminMode && permissionsLoading),
    refreshCollections: fetchCollections,
    updateCollectionInCache,
    isAdmin,
    isEditor,
    hasAdminAccess: isAdmin || isEditor,
  };
}
