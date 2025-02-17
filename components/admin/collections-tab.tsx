"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { LoadingIndicator } from "@/components/ui/loading-indicator";
import { Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

interface Collection {
  name: string;
  documentCount: number;
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
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  const fetchCollections = async () => {
    try {
      const response = await fetch("/api/store/collections");
      if (!response.ok) throw new Error("Failed to fetch collections");
      const collections = await response.json();
      setCollections(collections);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch collections"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCollections();
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
        throw new Error("Failed to delete collection");
      }

      // Refresh collections list
      await fetchCollections();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete collection"
      );
    }
  };

  if (loading) {
    return <LoadingIndicator text="Loading collections..." className="py-8" />;
  }

  if (error) {
    return <div className="text-red-500 py-8">{error}</div>;
  }

  return (
    <>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {collections.map((collection) => (
          <Card key={collection.name}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {collection.name}
              </CardTitle>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-red-500"
                onClick={() =>
                  setDeleteDialog({
                    isOpen: true,
                    collection: collection.name,
                  })
                }
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Documents: {collection.documentCount}
              </p>
            </CardContent>
          </Card>
        ))}
        {collections.length === 0 && (
          <div className="col-span-full text-center py-8 text-muted-foreground">
            No collections found
          </div>
        )}
      </div>

      <AlertDialog
        open={deleteDialog.isOpen}
        onOpenChange={(isOpen: boolean) => {
          setDeleteDialog({ isOpen, collection: null });
          setDeleteConfirmText("");
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <div className="space-y-4">
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the
                collection &quot;{deleteDialog.collection}&quot; and all its
                documents.
              </AlertDialogDescription>
              <div className="text-sm text-muted-foreground">
                Please type <span className="font-bold">DELETE</span> to
                confirm:
              </div>
              <Input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="Type DELETE to confirm"
              />
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500 hover:bg-red-600 disabled:bg-red-300"
              onClick={() => {
                if (deleteDialog.collection && deleteConfirmText === "DELETE") {
                  handleDelete(deleteDialog.collection);
                }
                setDeleteDialog({ isOpen: false, collection: null });
                setDeleteConfirmText("");
              }}
              disabled={deleteConfirmText !== "DELETE"}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
