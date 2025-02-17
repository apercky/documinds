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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCallback, useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { CreateCollectionDialog } from "./create-collection-dialog";

interface Collection {
  name: string;
  documentCount: number;
}

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

export function UploadTab() {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [collections, setCollections] = useState<Collection[]>([]);

  const form = useForm<UploadFormValues>({
    resolver: zodResolver(uploadSchema),
    defaultValues: {
      collectionName: "",
    },
  });

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
    }
  };

  useEffect(() => {
    fetchCollections();
  }, []);

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
    await fetchCollections();
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
      const formData = new FormData();
      formData.append("collectionName", values.collectionName);
      files.forEach((file) => {
        formData.append("file", file);
      });

      const response = await fetch("/api/store/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to upload documents");
      }

      setFiles([]);
      form.reset();
      await fetchCollections();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to upload documents"
      );
    } finally {
      setUploading(false);
    }
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
                <div className="flex justify-end">
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
                        disabled={uploading}
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
