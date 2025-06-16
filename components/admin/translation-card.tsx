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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  Check,
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
  Wand2,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

interface TranslationGroup {
  key: string;
  namespace: string;
  translations: Record<string, string>;
  completionCount: number;
  totalLocales: number;
}

interface Locale {
  code: string;
  name: string;
  flag: string;
}

interface TranslationCardProps {
  group: TranslationGroup;
  supportedLocales: Locale[];
  onTranslationUpdate: (
    key: string,
    namespace: string,
    locale: string,
    value: string
  ) => Promise<void>;
  onKeyDelete: (key: string, namespace: string) => Promise<void>;
}

export function TranslationCard({
  group,
  supportedLocales,
  onTranslationUpdate,
  onKeyDelete,
}: TranslationCardProps) {
  const t = useTranslations("Translations");
  const [isExpanded, setIsExpanded] = useState(false);
  const [editingLocale, setEditingLocale] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [isTranslating, setIsTranslating] = useState(false);

  const isComplete = group.completionCount === group.totalLocales;
  const missingCount = group.totalLocales - group.completionCount;

  const handleEditStart = (locale: string, currentValue: string) => {
    setEditingLocale(locale);
    setEditValue(currentValue);
  };

  const handleEditSave = async (locale: string) => {
    if (editValue.trim()) {
      await onTranslationUpdate(
        group.key,
        group.namespace,
        locale,
        editValue.trim()
      );
    }
    setEditingLocale(null);
    setEditValue("");
  };

  const handleEditCancel = () => {
    setEditingLocale(null);
    setEditValue("");
  };

  const handleKeyPress = (e: React.KeyboardEvent, locale: string) => {
    if (e.key === "Enter") {
      handleEditSave(locale);
    } else if (e.key === "Escape") {
      handleEditCancel();
    }
  };

  const handleQuickTranslate = async () => {
    setIsTranslating(true);
    try {
      // Find the first available translation to use as source
      const sourceTranslation = Object.values(group.translations)[0];
      if (!sourceTranslation) return;

      // Get missing locales
      const missingLocales = supportedLocales.filter(
        (locale) => !group.translations[locale.code]
      );

      // Simple AI translation simulation (in real app, this would call an AI service)
      for (const locale of missingLocales) {
        // For demo purposes, we'll just add a placeholder
        const translatedValue = `[${locale.name}] ${sourceTranslation}`;
        await onTranslationUpdate(
          group.key,
          group.namespace,
          locale.code,
          translatedValue
        );
      }
    } catch (error) {
      console.error("Translation failed:", error);
    } finally {
      setIsTranslating(false);
    }
  };

  return (
    <Card className={cn("transition-all duration-200")}>
      {/* Collapsed View */}
      <CardHeader className="py-4 pb-3">
        <div
          className="flex items-center justify-between cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-3">
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
            <div className="flex items-center gap-2">
              <span className="text-sm">🔑</span>
              <span className="font-medium">{group.key}</span>
              <Badge variant="outline" className="text-xs">
                {group.namespace}
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isComplete ? (
              <Badge
                variant="default"
                className="bg-green-100 text-green-800 hover:bg-green-100"
              >
                <Check className="h-3 w-3 mr-1" />
                {t("card.complete")} ({group.completionCount}/
                {group.totalLocales})
              </Badge>
            ) : (
              <Badge
                variant="secondary"
                className="bg-yellow-100 text-yellow-800"
              >
                ⚠️ {t("card.missing")} ({missingCount}/{group.totalLocales})
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      {/* Expanded View */}
      {isExpanded && (
        <CardContent className="pt-0">
          <div className="space-y-3">
            {supportedLocales.map((locale) => {
              const currentValue = group.translations[locale.code] || "";
              const isEditing = editingLocale === locale.code;
              const hasTranslation = !!currentValue;

              return (
                <div
                  key={locale.code}
                  className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30"
                >
                  <div className="flex items-center gap-2 min-w-[120px]">
                    <span className="text-lg">{locale.flag}</span>
                    <span className="text-sm font-medium">{locale.name}</span>
                  </div>

                  <div className="flex-1">
                    {isEditing ? (
                      <Input
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => handleKeyPress(e, locale.code)}
                        onBlur={() => handleEditSave(locale.code)}
                        className="w-full"
                        autoFocus
                      />
                    ) : hasTranslation ? (
                      <div
                        className="p-2 rounded cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() =>
                          handleEditStart(locale.code, currentValue)
                        }
                      >
                        <span className="text-sm">{currentValue}</span>
                      </div>
                    ) : (
                      <div
                        className="p-2 rounded cursor-pointer hover:bg-muted/50 transition-colors text-muted-foreground"
                        onClick={() => handleEditStart(locale.code, "")}
                      >
                        <span className="text-sm italic">
                          {t("card.clickToAdd")}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    {hasTranslation ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEditStart(locale.code, "")}
                        className="text-xs"
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        {t("card.add")}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-3 border-t">
              <div className="flex gap-2">
                {missingCount > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleQuickTranslate}
                    disabled={isTranslating}
                    className="flex items-center gap-2"
                  >
                    <Wand2 className="h-3 w-3" />
                    {isTranslating
                      ? t("card.translating")
                      : t("card.quickTranslate")}
                  </Button>
                )}
              </div>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    {t("card.deleteKey")}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      {t("deleteDialog.title")}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      {t("deleteDialog.description", {
                        key: group.key,
                        namespace: group.namespace,
                      })}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>
                      {t("deleteDialog.cancel")}
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => onKeyDelete(group.key, group.namespace)}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {t("deleteDialog.delete")}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
