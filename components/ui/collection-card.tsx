"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCollectionTitle } from "@/utils/messages.utils";
import { Collection } from "@prisma/client";
import { Trash2 } from "lucide-react";
import { useMessages } from "next-intl";
import { ReactNode } from "react";

interface CollectionCardProps {
  collection: Collection;
  onClick?: () => void;
  onDelete?: (e: React.MouseEvent) => void;
  showDeleteButton?: boolean;
  documentCountLabel: string;
  noDescriptionLabel: string;
  icon?: ReactNode;
  useTranslatedTitle?: boolean;
}

export function CollectionCard({
  collection,
  onClick,
  onDelete,
  showDeleteButton = false,
  documentCountLabel,
  noDescriptionLabel,
  icon,
  useTranslatedTitle = false,
}: CollectionCardProps) {
  const intlMessages = useMessages();

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete(e);
    }
  };

  const title = useTranslatedTitle
    ? getCollectionTitle(collection, intlMessages)
    : collection.name;

  return (
    <Card
      className="cursor-pointer transition-colors hover:bg-muted/50"
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {showDeleteButton ? (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-red-500"
            onClick={handleDeleteClick}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        ) : (
          icon && (
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              {icon}
            </div>
          )
        )}
      </CardHeader>
      <CardContent>
        {collection.description && (
          <p className="text-sm text-muted-foreground mb-2">
            {collection.description || noDescriptionLabel}
          </p>
        )}
        <p className="text-xs text-muted-foreground">{documentCountLabel}</p>
      </CardContent>
    </Card>
  );
}
