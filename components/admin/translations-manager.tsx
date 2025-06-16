"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, RefreshCw, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { AddKeyDialog } from "./add-key-dialog";
import { ImportExportButtons } from "./import-export-buttons";
import { TranslationCard } from "./translation-card";

interface Translation {
  id: string;
  key: string;
  locale: string;
  value: string;
  namespace: string;
  createdAt: string;
  updatedAt: string;
}

interface TranslationGroup {
  key: string;
  namespace: string;
  translations: Record<string, string>;
  completionCount: number;
  totalLocales: number;
}

const SUPPORTED_LOCALES = [
  { code: "en", name: "English", flag: "🇺🇸" },
  { code: "it", name: "Italian", flag: "🇮🇹" },
];

export function TranslationsManager() {
  const t = useTranslations("Translations");
  const [translations, setTranslations] = useState<Translation[]>([]);
  const [namespaces, setNamespaces] = useState<string[]>([]);
  const [selectedNamespace, setSelectedNamespace] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilter, setShowFilter] = useState<"all" | "missing" | "recent">(
    "all"
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isAddKeyOpen, setIsAddKeyOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { toast } = useToast();

  // Fetch translations and namespaces
  useEffect(() => {
    fetchTranslations();
    fetchNamespaces();
  }, []);

  const fetchTranslations = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/admin/translations");
      if (!response.ok) throw new Error("Failed to fetch translations");
      const data = await response.json();
      setTranslations(data.translations || []);
    } catch (error) {
      console.error("Error fetching translations:", error);
      toast({
        title: t("errors.fetchTranslations"),
        description: t("errors.fetchTranslations"),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchNamespaces = async () => {
    try {
      const response = await fetch("/api/admin/translations/namespaces");
      if (!response.ok) throw new Error("Failed to fetch namespaces");
      const data = await response.json();
      setNamespaces(data.namespaces || []);
    } catch (error) {
      console.error("Error fetching namespaces:", error);
    }
  };

  // Group translations by key and namespace
  const translationGroups = useMemo(() => {
    const groups: Record<string, TranslationGroup> = {};

    translations.forEach((translation) => {
      const groupKey = `${translation.namespace}.${translation.key}`;

      if (!groups[groupKey]) {
        groups[groupKey] = {
          key: translation.key,
          namespace: translation.namespace,
          translations: {},
          completionCount: 0,
          totalLocales: SUPPORTED_LOCALES.length,
        };
      }

      groups[groupKey].translations[translation.locale] = translation.value;
    });

    // Calculate completion counts
    Object.values(groups).forEach((group) => {
      group.completionCount = Object.keys(group.translations).length;
    });

    return Object.values(groups);
  }, [translations]);

  // Filter and search logic
  const filteredGroups = useMemo(() => {
    let filtered = translationGroups;

    // Filter by namespace
    if (selectedNamespace !== "all") {
      filtered = filtered.filter(
        (group) => group.namespace === selectedNamespace
      );
    }

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(
        (group) =>
          group.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
          Object.values(group.translations).some((value) =>
            value.toLowerCase().includes(searchQuery.toLowerCase())
          )
      );
    }

    // Filter by show type
    if (showFilter === "missing") {
      filtered = filtered.filter(
        (group) => group.completionCount < group.totalLocales
      );
    } else if (showFilter === "recent") {
      // For now, just show all - could be enhanced with actual recent logic
      filtered = filtered;
    }

    // Sort: missing translations first, then alphabetical
    return filtered.sort((a, b) => {
      if (a.completionCount !== b.completionCount) {
        return a.completionCount - b.completionCount; // Missing first
      }
      return a.key.localeCompare(b.key);
    });
  }, [translationGroups, selectedNamespace, searchQuery, showFilter]);

  // Calculate namespace completion stats
  const namespaceStats = useMemo(() => {
    if (selectedNamespace === "all") {
      // Show overall stats across all namespaces
      const totalKeys = translationGroups.length;
      const completedKeys = translationGroups.filter(
        (group) => group.completionCount === group.totalLocales
      ).length;

      return {
        name: t("allNamespaces"),
        completed: completedKeys,
        total: totalKeys,
        percentage:
          totalKeys > 0 ? Math.round((completedKeys / totalKeys) * 100) : 0,
      };
    } else {
      // Show stats for selected namespace
      const namespaceGroups = translationGroups.filter(
        (group) => group.namespace === selectedNamespace
      );

      const totalKeys = namespaceGroups.length;
      const completedKeys = namespaceGroups.filter(
        (group) => group.completionCount === group.totalLocales
      ).length;

      return {
        name: selectedNamespace,
        completed: completedKeys,
        total: totalKeys,
        percentage:
          totalKeys > 0 ? Math.round((completedKeys / totalKeys) * 100) : 0,
      };
    }
  }, [translationGroups, selectedNamespace, t]);

  const handleTranslationUpdate = async (
    key: string,
    namespace: string,
    locale: string,
    value: string
  ) => {
    try {
      const response = await fetch("/api/admin/translations", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, namespace, locale, value }),
      });

      if (!response.ok) throw new Error("Failed to update translation");

      // Update local state
      setTranslations((prev) => {
        const existing = prev.find(
          (t) =>
            t.key === key && t.namespace === namespace && t.locale === locale
        );

        if (existing) {
          return prev.map((t) =>
            t.id === existing.id
              ? { ...t, value, updatedAt: new Date().toISOString() }
              : t
          );
        } else {
          // Add new translation
          const newTranslation: Translation = {
            id: `temp-${Date.now()}`,
            key,
            namespace,
            locale,
            value,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          return [...prev, newTranslation];
        }
      });

      toast({
        title: "Success",
        description: t("success.translationUpdated"),
      });
    } catch (error) {
      console.error("Error updating translation:", error);
      toast({
        title: "Error",
        description: t("errors.updateTranslation"),
        variant: "destructive",
      });
    }
  };

  const handleKeyDelete = async (key: string, namespace: string) => {
    try {
      const response = await fetch("/api/admin/translations", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, namespace }),
      });

      if (!response.ok) throw new Error("Failed to delete key");

      // Update local state
      setTranslations((prev) =>
        prev.filter((t) => !(t.key === key && t.namespace === namespace))
      );

      toast({
        title: "Success",
        description: t("success.keyDeleted"),
      });
    } catch (error) {
      console.error("Error deleting key:", error);
      toast({
        title: "Error",
        description: t("errors.deleteKey"),
        variant: "destructive",
      });
    }
  };

  const handleRefreshCache = async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch("/api/messages?action=reset");
      if (!response.ok) throw new Error("Failed to refresh cache");

      toast({
        title: "Success",
        description: t("success.cacheRefreshed"),
      });

      // Reload the page to apply the refreshed translations
      setTimeout(() => {
        window.location.reload();
      }, 1000); // Small delay to show the success toast
    } catch (error) {
      console.error("Error refreshing cache:", error);
      toast({
        title: "Error",
        description: t("errors.refreshCache"),
        variant: "destructive",
      });
      setIsRefreshing(false);
    }
  };

  if (isLoading) {
    return <div>{t("loading")}</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefreshCache}
            disabled={isRefreshing}
            className="flex items-center gap-2"
          >
            <RefreshCw
              className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
            />
            {isRefreshing ? t("refreshing") : t("refreshCache")}
          </Button>
          <ImportExportButtons
            selectedNamespace={selectedNamespace}
            onImportComplete={fetchTranslations}
          />
        </div>
      </div>

      {/* Namespace Completion Stats */}
      {namespaceStats && (
        <div className="flex items-center gap-4">
          <span className="text-lg font-medium">
            {namespaceStats.name}: {namespaceStats.completed}/
            {namespaceStats.total} {t("complete")}
          </span>
          <div className="flex items-center gap-2">
            <Progress value={namespaceStats.percentage} className="w-48" />
            <span className="text-sm text-muted-foreground font-medium">
              {namespaceStats.percentage}%
            </span>
          </div>
        </div>
      )}

      {/* Controls Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <Select
              value={selectedNamespace}
              onValueChange={setSelectedNamespace}
            >
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Select namespace" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("allNamespaces")}</SelectItem>
                {namespaces.map((namespace) => (
                  <SelectItem key={namespace} value={namespace}>
                    {namespace}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder={t("searchKeys")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <Button
              onClick={() => setIsAddKeyOpen(true)}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              {t("addKey")}
            </Button>

            <Select
              value={showFilter}
              onValueChange={(value: any) => setShowFilter(value)}
            >
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("showAll")}</SelectItem>
                <SelectItem value="missing">{t("showMissing")}</SelectItem>
                <SelectItem value="recent">{t("showRecent")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Translation Cards */}
      <div className="space-y-3">
        {filteredGroups.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center text-muted-foreground">
              {t("noTranslationsFound")}
            </CardContent>
          </Card>
        ) : (
          filteredGroups.map((group) => (
            <TranslationCard
              key={`${group.namespace}.${group.key}`}
              group={group}
              supportedLocales={SUPPORTED_LOCALES}
              onTranslationUpdate={handleTranslationUpdate}
              onKeyDelete={handleKeyDelete}
            />
          ))
        )}
      </div>

      {/* Add Key Dialog */}
      <AddKeyDialog
        open={isAddKeyOpen}
        onOpenChange={setIsAddKeyOpen}
        namespaces={namespaces}
        supportedLocales={SUPPORTED_LOCALES}
        onKeyAdded={fetchTranslations}
      />
    </div>
  );
}
