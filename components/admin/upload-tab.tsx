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
import { Input } from "@/components/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { useForm } from "react-hook-form";
import { z } from "zod";

const uploadSchema = z.object({
  collectionName: z
    .string()
    .min(3, "Collection name must be at least 3 characters")
    .max(63, "Collection name must be less than 63 characters")
    .regex(
      /^[a-z0-9-]+$/,
      "Only lowercase letters, numbers, and hyphens are allowed"
    ),
});

type UploadFormValues = z.infer<typeof uploadSchema>;

export function UploadTab() {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<UploadFormValues>({
    resolver: zodResolver(uploadSchema),
    defaultValues: {
      collectionName: "",
    },
  });

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

  const handleUpload = async (values: UploadFormValues) => {
    if (files.length === 0) {
      setError("Please select files to upload");
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const documents = await Promise.all(
        files.map(async (file) => {
          const text = await file.text();
          return {
            content: text,
            metadata: {
              source: file.name,
              type: file.type,
              size: file.size,
            },
          };
        })
      );

      const response = await fetch("/api/store/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documents,
          collectionName: values.collectionName,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to upload documents");
      }

      setFiles([]);
      form.reset();
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
              <FormField
                control={form.control}
                name="collectionName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Collection Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter collection name"
                        {...field}
                        disabled={uploading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

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
