"use client";

import { Button } from "@/components/ui/button";
import { DeleteAlertDialog } from "@/components/ui/delete-alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { LoadingIndicator } from "@/components/ui/loading-indicator";
import { useCollection } from "@/hooks/use-collection";
import type { Attribute, AttributeType } from "@/lib/prisma/generated";
import { attributeTypeValues } from "@/lib/schemas/attribute.schema";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

interface CollectionDetailsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  collectionId: string;
  onUpdate: () => void;
}

// Define the API response type
interface CollectionResponse {
  id: string;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
  attributes: Attribute[];
  documentCount: number | null;
}

export function CollectionDetailsDialog({
  isOpen,
  onOpenChange,
  collectionId,
  onUpdate,
}: CollectionDetailsDialogProps) {
  const tDetails = useTranslations("collectionDetails");
  const [isEditing, setIsEditing] = useState(false);
  const [collection, setCollection] = useState<CollectionResponse | null>(null);
  const [editedAttributes, setEditedAttributes] = useState<
    Record<AttributeType, string>
  >({} as Record<AttributeType, string>);
  const [error, setError] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { updateCollectionInCache } = useCollection({
    useAdminMode: true,
  });

  // Fetch the collection when the dialog opens
  useEffect(() => {
    if (isOpen && collectionId) {
      fetchCollection();
    }
  }, [isOpen, collectionId]);

  const fetchCollection = async () => {
    if (!collectionId) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/store/collections/${collectionId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch collection");
      }

      const data: CollectionResponse = await response.json();
      setCollection(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch collection"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = () => {
    if (!collection) return;

    // Initialize with all attribute types and their current values or empty strings
    const initialAttributes = attributeTypeValues.reduce((acc, type) => {
      const attribute = collection.attributes.find(
        (attr) => attr.type === type
      );
      acc[type] = attribute?.value || "";
      return acc;
    }, {} as Record<AttributeType, string>);

    setEditedAttributes(initialAttributes);
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!collection) return;

    try {
      // Prepare attributes for update
      const attributesUpdate = Object.entries(editedAttributes).map(
        ([type, value]) => ({
          type: type as AttributeType,
          value: value.trim() || null,
        })
      );

      const response = await fetch(
        `/api/store/collections/${collection.id}/attributes`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            attributes: attributesUpdate,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(tDetails("error.update"));
      }

      // Update was successful
      setIsEditing(false);
      setError(null);
      fetchCollection(); // Refresh the collection data
      onUpdate(); // Call the update callback
    } catch (err) {
      setError(err instanceof Error ? err.message : tDetails("error.update"));
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setError(null);
  };

  const handleDeleteDocuments = async () => {
    if (!collection?.name) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/store/collections/${collection.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error(tDetails("error.deleteDocuments"));
      }

      await response.json();

      // Close the delete confirmation dialog
      setIsDeleteDialogOpen(false);

      // Reset any errors
      setError(null);

      // Update the collection count in the cache immediately for instant UI feedback
      updateCollectionInCache(collection.name, {
        // documentCount is not part of the Prisma schema, handled separately
      });

      // Call the update callback to refresh the collections list
      onUpdate();

      // Close the dialog to prevent showing stale data
      onOpenChange(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : tDetails("error.deleteDocuments")
      );
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return <LoadingIndicator text="Loading..." className="py-8" />;
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{tDetails("title")}</DialogTitle>
            <DialogDescription>{tDetails("description")}</DialogDescription>
          </DialogHeader>

          {collection && (
            <div className="grid gap-6">
              <div className="grid gap-2">
                <h3 className="text-lg font-semibold">
                  {tDetails("stats.title")}
                </h3>
                <div className="grid gap-1">
                  <div className="flex justify-between py-1">
                    <span className="text-muted-foreground">
                      {tDetails("stats.documents")}
                    </span>
                    <span className="font-medium">
                      {collection?.documentCount || 0}
                    </span>
                  </div>
                </div>
                {collection?.documentCount ? (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setIsDeleteDialogOpen(true)}
                    disabled={isDeleting}
                  >
                    {isDeleting
                      ? tDetails("settings.deletingDocuments")
                      : tDetails("settings.deleteDocuments")}
                  </Button>
                ) : null}
              </div>

              <div className="grid gap-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">
                    {tDetails("settings.title")}
                  </h3>
                  {!isEditing && (
                    <Button variant="outline" size="sm" onClick={handleEdit}>
                      {tDetails("settings.edit")}
                    </Button>
                  )}
                </div>

                <div className="grid gap-2">
                  <div className="flex justify-between py-1">
                    <span className="text-muted-foreground">
                      {tDetails("settings.name")}
                    </span>
                    <span className="font-medium">{collection?.name}</span>
                  </div>

                  {collection.description && (
                    <div className="flex justify-between py-1">
                      <span className="text-muted-foreground">
                        {tDetails("settings.description")}
                      </span>
                      <span className="font-medium">
                        {collection.description}
                      </span>
                    </div>
                  )}

                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-muted-foreground">
                      {tDetails("settings.attributes")}
                    </h4>
                    <div className="rounded-lg border bg-card">
                      {attributeTypeValues.map((type) => (
                        <div
                          key={type}
                          className="flex items-center justify-between p-3 border-b last:border-0"
                        >
                          <span className="text-sm font-medium">{type}</span>
                          {isEditing ? (
                            <Input
                              className="max-w-[200px]"
                              value={editedAttributes[type] || ""}
                              onChange={(e) =>
                                setEditedAttributes((prev) => ({
                                  ...prev,
                                  [type]: e.target.value,
                                }))
                              }
                              placeholder={tDetails(
                                "settings.valuePlaceholder"
                              )}
                            />
                          ) : (
                            <span className="text-sm text-muted-foreground">
                              {collection.attributes.find(
                                (attr) => attr.type === type
                              )?.value || "-"}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {error && <p className="text-sm text-red-500 mt-2">{error}</p>}

          {isEditing && (
            <DialogFooter>
              <Button variant="outline" onClick={handleCancel}>
                {tDetails("settings.cancel")}
              </Button>
              <Button onClick={handleSave}>{tDetails("settings.save")}</Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      <DeleteAlertDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleDeleteDocuments}
        name={`${tDetails("deleteDialog.allDocumentsIn")} ${collection?.name}`}
        confirmationWord="DELETE"
      />
    </>
  );
}
