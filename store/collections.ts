"use client";

import { Collection } from "@prisma/client";
import { create } from "zustand";

/**
 * Interface for the collections store state
 */
interface CollectionsState {
  // Collections data
  collections: Collection[];
  isLoading: boolean;
  lastUpdated: number | null;

  // Actions
  setCollections: (collections: Collection[]) => void;
  addCollection: (collection: Collection) => void;
  updateCollection: (
    collectionName: string,
    updates: Partial<Collection>
  ) => void;
  deleteCollection: (collectionName: string) => void;
  setLoading: (isLoading: boolean) => void;
  refreshTimestamp: () => void;
}

/**
 * Zustand store for managing collections state
 */
export const useCollectionsStore = create<CollectionsState>((set) => ({
  // Initial state
  collections: [],
  isLoading: true,
  lastUpdated: null,

  // Actions
  setCollections: (collections) =>
    set({
      collections,
      isLoading: false,
      lastUpdated: Date.now(),
    }),

  addCollection: (collection) =>
    set((state) => ({
      collections: [...state.collections, collection],
      lastUpdated: Date.now(),
    })),

  updateCollection: (collectionName, updates) =>
    set((state) => ({
      collections: state.collections.map((collection) =>
        collection.name === collectionName
          ? { ...collection, ...updates }
          : collection
      ),
      lastUpdated: Date.now(),
    })),

  deleteCollection: (collectionName) =>
    set((state) => ({
      collections: state.collections.filter(
        (collection) => collection.name !== collectionName
      ),
      lastUpdated: Date.now(),
    })),

  setLoading: (isLoading) => set({ isLoading }),

  refreshTimestamp: () => set({ lastUpdated: Date.now() }),
}));
