"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTranslations } from "next-intl";

interface CollectionDetailsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  collection: {
    name: string;
    documentCount: number;
    metadata?: Record<string, unknown>;
  } | null;
}

export function CollectionDetailsDialog({
  isOpen,
  onOpenChange,
  collection,
}: CollectionDetailsDialogProps) {
  const tDetails = useTranslations("collectionDetails");
  const tMetadata = useTranslations("metadataKeys");

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{tDetails("title")}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-6">
          <div className="grid gap-2">
            <h3 className="text-lg font-semibold">{tDetails("stats.title")}</h3>
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
          </div>

          <div className="grid gap-4">
            <h3 className="text-lg font-semibold">
              {tDetails("settings.title")}
            </h3>

            <div className="grid gap-2">
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">
                  {tDetails("settings.name")}
                </span>
                <span className="font-medium">{collection?.name}</span>
              </div>

              {collection?.metadata &&
                Object.entries(collection.metadata).length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-muted-foreground">
                      {tDetails("settings.metadata")}
                    </h4>
                    <div className="rounded-lg border bg-card">
                      {Object.entries(collection.metadata).map(
                        ([key, value]) => (
                          <div
                            key={key}
                            className="flex items-center justify-between p-3 border-b last:border-0"
                          >
                            <span className="text-sm font-medium">
                              {tMetadata(
                                key as
                                  | "brand"
                                  | "category"
                                  | "displayName"
                                  | "displayKey"
                              )}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              {String(value)}
                            </span>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
