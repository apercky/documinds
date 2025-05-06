"use client";

import { CollectionDetailsDialog } from "@/components/admin/collection-details-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DeleteAlertDialog } from "@/components/ui/delete-alert-dialog";
import { LoadingIndicator } from "@/components/ui/loading-indicator";
import { Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { CreateCollectionDialog } from "./create-collection-dialog";

interface Collection {
  name: string;
  documentCount: number;
  metadata?: Record<string, unknown>;
}

export function CollectionsTab() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    collection: string | null;
  }>({
    isOpen: false,
    collection: null,
  });
  const [detailsDialog, setDetailsDialog] = useState<{
    isOpen: boolean;
    collection: Collection | null;
  }>({
    isOpen: false,
    collection: null,
  });

  const t = useTranslations();

  const fetchCollections = async () => {
    try {
      const response = await fetch("/api/store/collections");
      if (!response.ok) throw new Error(t("collections.error.fetch"));
      const collections = await response.json();
      setCollections(collections);

      // If details dialog is open, update its collection data with the latest data
      if (detailsDialog.isOpen && detailsDialog.collection) {
        const updatedCollection = collections.find(
          (c: Collection) => c.name === detailsDialog.collection?.name
        );
        if (updatedCollection) {
          setDetailsDialog({
            isOpen: true,
            collection: updatedCollection,
          });
        }
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t("collections.error.fetch")
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCollections();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDelete = async (collectionName: string) => {
    try {
      const response = await fetch("/api/store/collections", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ collectionName }),
      });

      if (!response.ok) {
        throw new Error(t("collections.error.delete"));
      }

      // Refresh collections list
      await fetchCollections();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t("collections.error.delete")
      );
    }
  };

  const handleCollectionCreated = async () => {
    setError(null);
    await fetchCollections();
  };

  if (loading) {
    return (
      <LoadingIndicator text={t("collections.loading")} className="py-8" />
    );
  }

  if (error) {
    return <div className="text-red-500 py-8">{error}</div>;
  }

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold">{t("collections.title")}</h2>
        <CreateCollectionDialog onCollectionCreated={handleCollectionCreated} />
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {collections.map((collection) => (
          <Card
            key={collection.name}
            className="cursor-pointer transition-colors hover:bg-muted/50"
            onClick={() => setDetailsDialog({ isOpen: true, collection })}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {collection.name}
              </CardTitle>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-red-500"
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteDialog({
                    isOpen: true,
                    collection: collection.name,
                  });
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {t("collections.documents")}: {collection.documentCount}
              </p>
            </CardContent>
          </Card>
        ))}
        {collections.length === 0 && (
          <div className="col-span-full text-center py-8 text-muted-foreground">
            {t("collections.empty")}
          </div>
        )}
      </div>

      <DeleteAlertDialog
        isOpen={deleteDialog.isOpen}
        onOpenChange={(isOpen) =>
          setDeleteDialog({
            isOpen,
            collection: isOpen ? deleteDialog.collection : null,
          })
        }
        onConfirm={() => {
          if (deleteDialog.collection) {
            handleDelete(deleteDialog.collection);
          }
        }}
        name={deleteDialog.collection || ""}
      />

      <CollectionDetailsDialog
        isOpen={detailsDialog.isOpen}
        onOpenChange={(isOpen) =>
          setDetailsDialog({
            isOpen,
            collection: isOpen ? detailsDialog.collection : null,
          })
        }
        collection={detailsDialog.collection}
        onUpdate={fetchCollections}
      />
    </>
  );
}
