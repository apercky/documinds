"use client";

import { CollectionCard } from "@/components/ui/collection-card";
import { useCollection } from "@/hooks/use-collection";
import { FolderArchive } from "lucide-react";
import { useTranslations } from "next-intl";
import { CreateCollectionDialog } from "../admin/create-collection-dialog";

interface CollectionListProps {
  onSelectCollection: (collectionName: string) => void;
}

export function CollectionList({ onSelectCollection }: CollectionListProps) {
  const tCommon = useTranslations("Common");
  const {
    collections,
    isLoading: collectionsLoading,
    refreshCollections,
  } = useCollection();

  // This function will be called when a new collection is created
  const handleCollectionCreated = (collection: {
    id: string;
    name: string;
    description: string | null;
  }) => {
    // Trigger SWR revalidation
    refreshCollections();
    // Navigate to the newly created collection
    onSelectCollection(collection.name);
  };

  return (
    <div className="h-full flex flex-col bg-zinc-50/50 dark:bg-zinc-900/50 p-6 overflow-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">
          {tCommon("selectCollectionTitle")}
        </h2>
        <CreateCollectionDialog onCollectionCreated={handleCollectionCreated} />
      </div>

      {collectionsLoading ? (
        <div className="flex justify-center items-center h-40">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : collections.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground">
          {tCommon("noCollectionsAvailable")}
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {collections.map((collection) => (
            <CollectionCard
              key={collection.id || collection.name}
              collection={collection}
              onClick={() => onSelectCollection(collection.name)}
              documentCountLabel={tCommon("documentsCount", {
                count: collection.documentCount || 0,
              })}
              noDescriptionLabel={tCommon("noDescription")}
              icon={<FolderArchive className="h-4 w-4 text-primary" />}
              useTranslatedTitle={true}
            />
          ))}
        </div>
      )}
    </div>
  );
}
