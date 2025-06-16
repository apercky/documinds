import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslations } from "next-intl";
import { Suspense } from "react";
import { TranslationsManager } from "./translations-manager";

export function TranslationsTab() {
  const t = useTranslations("Translations");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">{t("management")}</h2>
        <p className="text-muted-foreground">{t("description")}</p>
      </div>

      <Suspense fallback={<TranslationsLoadingSkeleton />}>
        <TranslationsManager />
      </Suspense>
    </div>
  );
}

function TranslationsLoadingSkeleton() {
  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex gap-4">
              <Skeleton className="h-10 w-48" />
              <Skeleton className="h-10 w-64" />
              <Skeleton className="h-10 w-32" />
            </div>
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
