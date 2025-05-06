"use client";

import { Button } from "@/components/ui/button";
import { DeleteAlertDialog } from "@/components/ui/delete-alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { METADATA_KEYS } from "@/consts/consts";
import { useTranslations } from "next-intl";
import { useState } from "react";

interface CollectionDetailsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  collection: {
    name: string;
    documentCount: number;
    metadata?: Record<string, unknown>;
  } | null;
  onUpdate: () => void;
}

export function CollectionDetailsDialog({
  isOpen,
  onOpenChange,
  collection,
  onUpdate,
}: CollectionDetailsDialogProps) {
  const tDetails = useTranslations("collectionDetails");
  const tMetadata = useTranslations("metadataKeys");
  const [isEditing, setIsEditing] = useState(false);
  const [editedMetadata, setEditedMetadata] = useState<Record<string, string>>(
    {}
  );
  const [error, setError] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleEdit = () => {
    // Initialize with all metadata keys and their current values or empty strings
    const initialMetadata = METADATA_KEYS.reduce((acc, key) => {
      const currentValue = collection?.metadata?.[key.value];
      acc[key.value] = currentValue ? String(currentValue) : "";
      return acc;
    }, {} as Record<string, string>);

    setEditedMetadata(initialMetadata);
    setIsEditing(true);
  };

  const handleSave = async () => {
    try {
      const cleanedMetadata = Object.entries(editedMetadata).reduce(
        (acc, [key, value]) => {
          if (value.trim()) {
            acc[key] = value.trim();
          }
          return acc;
        },
        {} as Record<string, string>
      );

      const response = await fetch(
        `/api/store/collections/${collection?.name}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            metadata: cleanedMetadata,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(tDetails("error.update"));
      }

      setIsEditing(false);
      setError(null);
      onUpdate(); // Call the update callback
      onOpenChange(false);
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
      const response = await fetch(
        `/api/store/collections/${collection.name}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        throw new Error(tDetails("error.deleteDocuments"));
      }

      const result = await response.json();

      // Close the delete confirmation dialog
      setIsDeleteDialogOpen(false);

      // Reset any errors
      setError(null);

      // Call the update callback to refresh the collections list
      // This will also update the collection data in this dialog via the parent component
      onUpdate();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : tDetails("error.deleteDocuments")
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{tDetails("title")}</DialogTitle>
          </DialogHeader>

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

                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground">
                    {tDetails("settings.metadata")}
                  </h4>
                  <div className="rounded-lg border bg-card">
                    {METADATA_KEYS.map((key) => (
                      <div
                        key={key.value}
                        className="flex items-center justify-between p-3 border-b last:border-0"
                      >
                        <span className="text-sm font-medium">
                          {tMetadata(key.label)}
                        </span>
                        {isEditing ? (
                          <Input
                            className="max-w-[200px]"
                            value={editedMetadata[key.value] || ""}
                            onChange={(e) =>
                              setEditedMetadata((prev) => ({
                                ...prev,
                                [key.value]: e.target.value,
                              }))
                            }
                            placeholder={tDetails("settings.valuePlaceholder")}
                          />
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            {String(collection?.metadata?.[key.value] ?? "-")}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

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
