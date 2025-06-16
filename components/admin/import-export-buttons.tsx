"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Download, Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";

interface ImportExportButtonsProps {
  selectedNamespace: string;
  onImportComplete: () => void;
}

export function ImportExportButtons({
  selectedNamespace,
  onImportComplete,
}: ImportExportButtonsProps) {
  const t = useTranslations("Translations");
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [importPreview, setImportPreview] = useState<any>(null);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      if (selectedNamespace !== "all") {
        params.append("namespace", selectedNamespace);
      }

      const response = await fetch(`/api/admin/translations/export?${params}`);
      if (!response.ok) throw new Error("Export failed");

      const data = await response.json();

      // Create and download file
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `translations-${selectedNamespace}-${
        new Date().toISOString().split("T")[0]
      }.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: t("success.translationsExported"),
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Error",
        description: t("errors.exportTranslations"),
        variant: "destructive",
      });
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/json") {
      toast({
        title: "Error",
        description: t("errors.selectJsonFile"),
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = JSON.parse(e.target?.result as string);
        setImportPreview(content);
        setIsImportDialogOpen(true);
      } catch (error) {
        toast({
          title: "Error",
          description: t("errors.invalidJson"),
          variant: "destructive",
        });
      }
    };
    reader.readAsText(file);
  };

  const handleImportConfirm = async () => {
    if (!importPreview) return;

    setIsImporting(true);
    try {
      const response = await fetch("/api/admin/translations/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: importPreview }),
      });

      if (!response.ok) throw new Error("Import failed");

      toast({
        title: "Success",
        description: t("success.translationsImported"),
      });

      onImportComplete();
      setIsImportDialogOpen(false);
      setImportPreview(null);
    } catch (error) {
      console.error("Import error:", error);
      toast({
        title: "Error",
        description: t("errors.importTranslations"),
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleImportCancel = () => {
    setIsImportDialogOpen(false);
    setImportPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download className="h-4 w-4 mr-2" />
          {t("export")}
        </Button>
        <Button variant="outline" size="sm" onClick={handleImportClick}>
          <Upload className="h-4 w-4 mr-2" />
          {t("import")}
        </Button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileSelect}
        className="hidden"
      />

      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{t("importDialog.title")}</DialogTitle>
            <DialogDescription>
              {t("importDialog.description")}
            </DialogDescription>
          </DialogHeader>

          {importPreview && (
            <div className="max-h-60 overflow-y-auto bg-muted p-4 rounded-md">
              <pre className="text-sm">
                {JSON.stringify(importPreview, null, 2)}
              </pre>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={handleImportCancel}>
              {t("importDialog.cancel")}
            </Button>
            <Button onClick={handleImportConfirm} disabled={isImporting}>
              {isImporting
                ? t("importDialog.importing")
                : t("importDialog.import")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
