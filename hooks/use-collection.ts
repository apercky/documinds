"use client";

import { ROLES } from "@/consts/consts";
import { usePermissions } from "@/hooks/auth/use-permissions";
import { Collection } from "@/types/collection";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useErrorHandler } from "./use-error-handler";

// Query key for collections
const COLLECTIONS_QUERY_KEY = "collections";

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

  // Using the permissions hook to check roles
  const { hasRole } = usePermissions();

  // Determine user roles
  const isAdmin = hasRole(ROLES.ADMIN);
  const isEditor = hasRole(ROLES.EDITOR);

  // Define access mode based on roles and requested mode:
  // - Admin in admin mode: Gets all collections across all brands
  // - Editor in admin mode: Gets collections for their brand only
  // - Regular users: Get collections for their brand only
  const useAdminEndpoint = useAdminMode && isAdmin;

  // Using the centralized error handling hook
  const { handleError } = useErrorHandler();

  // Function to fetch collections
  const fetchCollections = async () => {
    if (status !== "authenticated") {
      return [];
    }

    try {
      // Choose endpoint based on access level:
      // - Use admin endpoint for admin users in admin mode
      // - Use regular endpoint with brand filter for everyone else (including editors)
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
      handleError(err);
      return [];
    }
  };

  // Using useQuery to manage cache and automatic invalidation
  const { data: collections = [], isLoading } = useQuery({
    queryKey: [COLLECTIONS_QUERY_KEY, userBrand, useAdminEndpoint],
    queryFn: fetchCollections,
    enabled: status === "authenticated",
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

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
    hasAdminAccess: isAdmin || isEditor, // True if user has any admin access (either full or brand-limited)
  };
}
