"use client";

import { ROLES } from "@/consts/consts";
import { usePermissions } from "@/hooks/auth/use-permissions";
import { Collection } from "@/types/collection";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useErrorHandler } from "./use-error-handler";

// Query key for collections
const COLLECTIONS_QUERY_KEY = "collections";
const STALE_TIME = 5 * 60 * 1000; // 5 minutes
const GC_TIME = 1 * 60 * 1000; // 1 minute

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
  const queryClient = useQueryClient();

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
  const fetchCollections = async () => {
    if (status !== "authenticated") {
      return [];
    }

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
      return collectionsData;
    } catch (err) {
      console.error("Error fetching collections:", err);
      // Only handle this error, not permission errors
      handleError(err);
      return [];
    }
  };

  // Using useQuery to manage cache and automatic invalidation
  const { data: collections = [], isLoading: collectionsLoading } = useQuery({
    queryKey: [COLLECTIONS_QUERY_KEY, userBrand, useAdminEndpoint],
    queryFn: fetchCollections,
    // Only enable if authenticated AND (not in admin mode OR permissions are loaded OR there was an error loading permissions)
    enabled:
      status === "authenticated" &&
      (!useAdminMode || !permissionsLoading || !!permissionsError),
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  });

  // Combined loading state
  const isLoading = collectionsLoading || (useAdminMode && permissionsLoading);

  // Function to invalidate the cache and force a refresh of collections
  const refreshCollections = () => {
    queryClient.invalidateQueries({
      queryKey: [COLLECTIONS_QUERY_KEY, userBrand, useAdminEndpoint],
    });
  };

  // Function to update a specific collection in the cache immediately
  // Useful for instant UI updates without waiting for a full refresh
  const updateCollectionInCache = (
    collectionName: string,
    updates: Partial<Collection>
  ) => {
    const currentData = queryClient.getQueryData<Collection[]>([
      COLLECTIONS_QUERY_KEY,
      userBrand,
      useAdminEndpoint,
    ]);

    if (currentData) {
      const updatedData = currentData.map((collection) =>
        collection.name === collectionName
          ? { ...collection, ...updates }
          : collection
      );

      queryClient.setQueryData(
        [COLLECTIONS_QUERY_KEY, userBrand, useAdminEndpoint],
        updatedData
      );
    }
  };

  // Return data and functions along with role information
  return {
    collections,
    isLoading,
    refreshCollections,
    updateCollectionInCache,
    isAdmin,
    isEditor,
    hasAdminAccess: isAdmin || isEditor,
  };
}
