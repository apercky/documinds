"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useTranslations } from "next-intl";
import { useState } from "react";

interface Locale {
  code: string;
  name: string;
  flag: string;
}

interface AddKeyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  namespaces: string[];
  supportedLocales: Locale[];
  onKeyAdded: () => void;
}

export function AddKeyDialog({
  open,
  onOpenChange,
  namespaces,
  supportedLocales,
  onKeyAdded,
}: AddKeyDialogProps) {
  const t = useTranslations("Translations");
  const [namespace, setNamespace] = useState("");
  const [key, setKey] = useState("");
  const [englishValue, setEnglishValue] = useState("");
  const [autoTranslate, setAutoTranslate] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!namespace || !key || !englishValue) {
      toast({
        title: "Error",
        description: t("errors.fillRequiredFields"),
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Create the English translation first
      const response = await fetch("/api/admin/translations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key,
          namespace,
          locale: "en",
          value: englishValue,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create translation");
      }

      // If auto-translate is enabled, create placeholder translations for other locales
      if (autoTranslate) {
        for (const locale of supportedLocales) {
          if (locale.code !== "en") {
            try {
              await fetch("/api/admin/translations", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  key,
                  namespace,
                  locale: locale.code,
                  value: `[${locale.name}] ${englishValue}`, // Simple placeholder
                }),
              });
            } catch (error) {
              console.error(
                `Failed to create ${locale.code} translation:`,
                error
              );
            }
          }
        }
      }

      toast({
        title: "Success",
        description: t("success.keyCreated"),
      });

      // Reset form
      setNamespace("");
      setKey("");
      setEnglishValue("");
      setAutoTranslate(true);

      onKeyAdded();
      onOpenChange(false);
    } catch (error) {
      console.error("Error creating translation:", error);
      toast({
        title: "Error",
        description: t("errors.createKey"),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setNamespace("");
    setKey("");
    setEnglishValue("");
    setAutoTranslate(true);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t("addDialog.title")}</DialogTitle>
          <DialogDescription>{t("addDialog.description")}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="namespace">{t("addDialog.namespace")}</Label>
            <Select value={namespace} onValueChange={setNamespace} required>
              <SelectTrigger>
                <SelectValue placeholder="Select namespace" />
              </SelectTrigger>
              <SelectContent>
                {namespaces.map((ns) => (
                  <SelectItem key={ns} value={ns}>
                    {ns}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="key">{t("addDialog.key")}</Label>
            <Input
              id="key"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder={t("addDialog.keyPlaceholder")}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="english">{t("addDialog.english")}</Label>
            <Input
              id="english"
              value={englishValue}
              onChange={(e) => setEnglishValue(e.target.value)}
              placeholder={t("addDialog.englishPlaceholder")}
              required
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="auto-translate"
              checked={autoTranslate}
              onCheckedChange={(checked: boolean) => setAutoTranslate(checked)}
            />
            <Label htmlFor="auto-translate" className="text-sm">
              {t("addDialog.autoTranslate")}
            </Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCancel}>
              {t("addDialog.cancel")}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? t("addDialog.adding") : t("addDialog.addKey")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
