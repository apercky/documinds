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
import { ProcessProgress } from "@/lib/vs/qdrant/vector-store";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCallback, useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { CreateCollectionDialog } from "./create-collection-dialog";

const collectionNameSchema = z
  .string()
  .min(3, "Collection name must be at least 3 characters")
  .max(63, "Collection name must be less than 63 characters")
  .regex(
    /^[a-z0-9-]+$/,
    "Only lowercase letters, numbers, and hyphens are allowed"
  );

const uploadSchema = z.object({
  collectionName: collectionNameSchema,
});

type UploadFormValues = z.infer<typeof uploadSchema>;

interface UploadProgress extends ProcessProgress {
  type: "progress" | "status" | "complete" | "error";
  message?: string;
  documentCount?: number;
}

export function UploadTab() {
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
    resolver: zodResolver(uploadSchema),
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

  const handleCollectionCreated = async (collectionName: string) => {
    setError(null);
    refreshCollections();
    form.setValue("collectionName", collectionName);
  };

  const handleUpload = async (values: UploadFormValues) => {
    if (files.length === 0) {
      setError("Please select files to upload");
      return;
    }

    setUploading(true);
    setError(null);

    try {
      for (let i = 0; i < files.length; i++) {
        const formData = new FormData();
        formData.append("collectionName", values.collectionName);
        formData.append("file", files[i]);

        const response = await fetch("/api/store/upload", {
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
          throw new Error("Failed to initialize upload stream");
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
      setError(
        err instanceof Error ? err.message : "Failed to upload documents"
      );
    } finally {
      setUploading(false);
      // Clear progress after a delay
      setTimeout(() => setUploadProgress(null), 3000);
    }
  };

  const getProgressValue = (progress: UploadProgress) => {
    if (progress.type === "status") return 0;
    if (progress.type === "complete") return 100;
    if (progress.type === "progress") {
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
                  <h2 className="text-lg font-semibold">Upload Documents</h2>
                  <CreateCollectionDialog
                    onCollectionCreated={handleCollectionCreated}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="collectionName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Collection Name</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        disabled={uploading || collectionsLoading}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a collection" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {collections.map((collection) => (
                            <SelectItem
                              key={collection.name}
                              value={collection.name}
                            >
                              {collection.name} ({collection.documentCount}{" "}
                              docs)
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
                  <p>Drop the files here ...</p>
                ) : (
                  <p>
                    Drag &apos;n&apos; drop some files here, or click to select
                    files
                  </p>
                )}
                <p className="text-sm text-muted-foreground mt-2">
                  Supported formats: PDF, DOC, DOCX, TXT
                </p>
              </div>

              {files.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-medium mb-2">Selected files:</h4>
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
                {uploading ? "Uploading..." : "Upload Documents"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
