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
 * @param options.useAdminMode If true, attempts to use admin endpoint (will only work if user has ADMIN role)
 */
export function useCollection({
  useAdminMode = false,
}: { useAdminMode?: boolean } = {}) {
  const { data: session, status } = useSession();
  const userBrand = session?.user?.brand;
  const queryClient = useQueryClient();

  // Using the permissions hook to check admin role
  const { hasRole } = usePermissions();

  // Determine if the user is actually an admin, regardless of useAdminMode parameter
  const isActuallyAdmin = hasRole(ROLES.ADMIN);

  // Only use admin mode if both the flag is set AND the user is actually an admin
  const effectiveAdminMode = useAdminMode && isActuallyAdmin;

  // Using the centralized error handling hook
  const { handleError } = useErrorHandler();

  // Function to fetch collections
  const fetchCollections = async () => {
    if (status !== "authenticated") {
      return [];
    }

    try {
      // If admin mode is requested AND user has admin role, use the admin endpoint
      // Otherwise use regular endpoint with brand filter, even if adminMode was requested but user lacks permissions
      const url = effectiveAdminMode
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
    queryKey: [COLLECTIONS_QUERY_KEY, userBrand, effectiveAdminMode],
    queryFn: fetchCollections,
    enabled: status === "authenticated",
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  // Function to invalidate the cache and force a refresh of collections
  const refreshCollections = () => {
    queryClient.invalidateQueries({
      queryKey: [COLLECTIONS_QUERY_KEY, userBrand, effectiveAdminMode],
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
      effectiveAdminMode,
    ]);

    if (currentData) {
      const updatedData = currentData.map((collection) =>
        collection.name === collectionName
          ? { ...collection, ...updates }
          : collection
      );

      queryClient.setQueryData(
        [COLLECTIONS_QUERY_KEY, userBrand, effectiveAdminMode],
        updatedData
      );
    }
  };

  // Return data and functions
  return {
    collections,
    isLoading,
    refreshCollections,
    updateCollectionInCache,
    isAdmin: isActuallyAdmin, // Also return whether the user is actually an admin
  };
}
