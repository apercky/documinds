"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { ProgressWithText } from "@/components/ui/progress-with-text";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCollection } from "@/hooks/use-collection";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { CreateCollectionDialog } from "./create-collection-dialog";

const getCollectionNameSchema = (t: any) =>
  z
    .string()
    .min(3, t("name.min", { min: 3 }))
    .max(63, t("name.max", { max: 63 }))
    .regex(/^[a-z0-9-]+$/, t("name.format"));

const getUploadSchema = (t: any) =>
  z.object({
    collectionName: getCollectionNameSchema(t),
  });

type UploadFormValues = z.infer<ReturnType<typeof getUploadSchema>>;

interface UploadProgress {
  type: "progress" | "status" | "complete" | "error";
  message?: string;
  currentDocument?: number;
  totalDocuments?: number;
  details?: string;
  session_id?: string;
}

export function UploadTab() {
  const t = useTranslations("Upload");
  const tValidation = useTranslations("validation.collection");

  // Use our custom hook for collections
  const {
    collections,
    isLoading: collectionsLoading,
    refreshCollections,
  } = useCollection({
    useAdminMode: true,
  });

  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(
    null
  );

  const form = useForm<UploadFormValues>({
    resolver: zodResolver(getUploadSchema(tValidation)),
    defaultValues: {
      collectionName: "",
    },
  });

  // Reset form and state when component mounts
  useEffect(() => {
    form.reset();
    setFiles([]);
    setError(null);
    setUploadProgress(null);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles(acceptedFiles);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "application/msword": [".doc"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        [".docx"],
      "text/plain": [".txt"],
    },
  });

  const handleCollectionCreated = async (collection: {
    id: string;
    name: string;
    description: string | null;
  }) => {
    setError(null);
    refreshCollections();
    form.setValue("collectionName", collection.name);
  };

  const handleUpload = async (values: UploadFormValues) => {
    if (files.length === 0) {
      setError(t("pleaseSelectFiles"));
      return;
    }

    setUploading(true);
    setError(null);

    try {
      for (let i = 0; i < files.length; i++) {
        const formData = new FormData();
        formData.append("collectionName", values.collectionName);
        formData.append("file", files[i]);

        const response = await fetch("/api/store/embed", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`Failed to upload document ${files[i].name}`);
        }

        // Set up SSE
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) {
          throw new Error(t("failedToInitialize"));
        }

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6)) as UploadProgress;
                setUploadProgress(data);

                if (data.type === "error") {
                  throw new Error(data.message);
                }
              } catch (e) {
                console.error("Failed to parse SSE data:", e);
              }
            }
          }
        }
      }

      setFiles([]);
      form.setValue("collectionName", values.collectionName);
      // Refresh collections list after upload
      refreshCollections();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("failedToUpload"));
    } finally {
      setUploading(false);
      // Clear progress after a delay
      setTimeout(() => setUploadProgress(null), 3000);
    }
  };

  const getProgressValue = (progress: UploadProgress) => {
    if (progress.type === "status") return 0;
    if (progress.type === "complete") return 100;
    if (
      progress.type === "progress" &&
      progress.currentDocument &&
      progress.totalDocuments
    ) {
      return (progress.currentDocument / progress.totalDocuments) * 100;
    }
    return 0;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleUpload)}
              className="space-y-6"
            >
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-semibold">{t("title")}</h2>
                  <CreateCollectionDialog
                    onCollectionCreated={handleCollectionCreated}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="collectionName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("collectionName")}</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        disabled={uploading || collectionsLoading}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t("selectCollection")} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {collections.map((collection) => (
                            <SelectItem
                              key={collection.name}
                              value={collection.name}
                            >
                              {collection.name} ({collection.documentCount}{" "}
                              {t("docs")})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
                  ${
                    isDragActive
                      ? "border-primary bg-primary/5"
                      : "border-gray-300 hover:border-primary"
                  }`}
              >
                <input {...getInputProps()} />
                {isDragActive ? (
                  <p>{t("dropFilesHere")}</p>
                ) : (
                  <p>{t("dragDropFiles")}</p>
                )}
                <p className="text-sm text-muted-foreground mt-2">
                  {t("supportedFormats")}
                </p>
              </div>

              {files.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-medium mb-2">{t("selectedFiles")}</h4>
                  <ul className="space-y-1">
                    {files.map((file) => (
                      <li key={file.name} className="text-sm">
                        {file.name} ({(file.size / 1024).toFixed(1)} KB)
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {uploadProgress && (
                <ProgressWithText
                  value={getProgressValue(uploadProgress)}
                  status={
                    uploadProgress.type === "progress"
                      ? uploadProgress.details
                      : uploadProgress.type === "complete" &&
                        uploadProgress.session_id
                      ? `${
                          uploadProgress.message
                        } (Session ID: ${uploadProgress.session_id.substring(
                          0,
                          8
                        )}...)`
                      : uploadProgress.message
                  }
                  className="mt-4"
                />
              )}

              {error && <p className="text-red-500 mt-4">{error}</p>}

              <Button
                type="submit"
                className="w-full"
                disabled={uploading || files.length === 0}
              >
                {uploading ? t("uploading") : t("uploadDocuments")}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
