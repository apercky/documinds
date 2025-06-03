"use client";

import { ROLES } from "@/consts/consts";
import { usePermissions } from "@/hooks/auth/use-permissions";
import { useCollectionsStore } from "@/store/collections";
import { Collection } from "@prisma/client";
import { useSession } from "next-auth/react";
import { useEffect } from "react";
import useSWR from "swr";
import { useErrorHandler } from "./use-error-handler";

// Fetcher function for SWR
const fetcher = async (url: string) => {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      const errorText = await response.text();
      let errorData = null;
      try {
        errorData = JSON.parse(errorText);
      } catch (e) {
        // Ignore parsing error
      }

      // Create a standard error without using cause in constructor
      const error = new Error(
        `Failed to fetch collections: ${response.status} ${response.statusText}`
      );
      // Add cause property manually
      (error as any).cause = {
        status: response.status,
        statusText: response.statusText,
        data: errorData || errorText,
        url,
      };

      throw error;
    }
    return response.json();
  } catch (error) {
    console.error("Error in collection fetcher:", error);
    throw error;
  }
};

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
  const { handleError } = useErrorHandler();

  // Use the Zustand store
  const {
    collections,
    isLoading: storeLoading,
    setCollections,
    addCollection,
    updateCollection: updateCollectionInStore,
    deleteCollection: deleteCollectionFromStore,
    setLoading,
  } = useCollectionsStore();

  // Using the permissions hook to check roles
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

  // Choose endpoint based on access level
  const url = useAdminEndpoint
    ? `/api/store/collections/admin`
    : `/api/store/collections?brand=${userBrand}`;

  // Skip fetching if not authenticated or permissions are still loading
  const shouldFetch =
    status === "authenticated" &&
    (!useAdminMode || !permissionsLoading || !!permissionsError);

  // Use SWR for data fetching with auto-revalidation
  const {
    error,
    isLoading: swrLoading,
    mutate,
  } = useSWR<Collection[]>(shouldFetch ? url : null, fetcher, {
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    dedupingInterval: 3000,
    errorRetryCount: 3,
    errorRetryInterval: 5000,
    // Custom retry function
    onErrorRetry: (error, key, config, revalidate, { retryCount }) => {
      // Don't retry for client errors (4xx)
      if (
        (error as any).cause?.status &&
        (error as any).cause.status >= 400 &&
        (error as any).cause.status < 500
      ) {
        return;
      }

      // Retry up to 3 times with increasing delay
      if (retryCount >= 3) return;

      // Exponential backoff
      setTimeout(() => revalidate({ retryCount }), 1000 * 2 ** retryCount);
    },
    onSuccess: (data) => {
      setCollections(data);
    },
    onError: (err) => {
      console.error("SWR Error:", err);
      setLoading(false);
      handleError(err);
    },
  });

  // Set loading state based on SWR loading state
  useEffect(() => {
    setLoading(swrLoading || permissionsLoading);
  }, [swrLoading, permissionsLoading, setLoading]);

  // Function to manually trigger a refresh
  const refreshCollections = () => mutate();

  // Function to update a specific collection in the cache and store
  const updateCollectionInCache = (
    collectionName: string,
    updates: Partial<Collection>
  ) => {
    // Update in Zustand store
    updateCollectionInStore(collectionName, updates);
    // Refresh data from server
    refreshCollections();
  };

  return {
    collections,
    isLoading:
      storeLoading || swrLoading || (useAdminMode && permissionsLoading),
    refreshCollections,
    updateCollectionInCache,
    addCollection,
    deleteCollection: (collectionName: string) => {
      deleteCollectionFromStore(collectionName);
      refreshCollections();
    },
    isAdmin,
    isEditor,
    hasAdminAccess: isAdmin || isEditor,
  };
}
