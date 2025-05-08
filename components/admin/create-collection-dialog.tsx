"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { zodResolver } from "@hookform/resolvers/zod";
import { PlusCircle, Trash2 } from "lucide-react";
import { useTranslations, type TranslationValues } from "next-intl";
import { useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";

import { METADATA_KEYS } from "@/consts/consts";

const createCollectionNameSchema = (
  t: <T extends string>(key: T, values?: TranslationValues) => string
) =>
  z
    .string()
    .min(3, { message: t("validation.collection.name.min", { min: 3 }) })
    .max(63, { message: t("validation.collection.name.max", { max: 63 }) })
    .regex(/^[a-z0-9-]+$/, { message: t("validation.collection.name.format") });

const createMetadataSchema = (
  t: <T extends string>(key: T, values?: TranslationValues) => string
) =>
  z.array(
    z.object({
      key: z.enum(
        ["brand", "category", "display-name", "display-key"] as const,
        {
          required_error: t("validation.collection.metadata.key.required"),
        }
      ),
      value: z
        .string()
        .min(1, { message: t("validation.collection.metadata.value.required") })
        .max(35, {
          message: t("validation.collection.metadata.value.max", { max: 35 }),
        })
        .refine((val) => val.trim().length > 0, {
          message: t("validation.collection.metadata.value.empty"),
        }),
    })
  );

interface CreateCollectionDialogProps {
  onCollectionCreated: (
    collectionName: string,
    metadata: Record<string, unknown>
  ) => void;
}

export function CreateCollectionDialog({
  onCollectionCreated,
}: CreateCollectionDialogProps) {
  const [open, setOpen] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const t = useTranslations();

  const tMetadata = useTranslations("metadataKeys");
  const tCreate = useTranslations("createCollection");

  const formSchema = z.object({
    name: createCollectionNameSchema(t),
    metadata: createMetadataSchema(t),
  });

  type FormValues = z.infer<typeof formSchema>;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      metadata: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "metadata",
  });

  // Get all currently selected keys
  const selectedKeys = form.watch("metadata")?.map((item) => item.key) || [];

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen) {
      form.reset();
      setApiError(null);
    }
  };

  // Find the first available key that hasn't been used
  const getNextAvailableKey = () => {
    return (
      METADATA_KEYS.find((key) => !selectedKeys.includes(key.value))?.value ||
      METADATA_KEYS[0].value
    );
  };

  const handleAddField = () => {
    const nextKey = getNextAvailableKey();
    if (nextKey) {
      append({ key: nextKey, value: "" });
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    e.stopPropagation();

    const values = form.getValues();
    if (!(await form.trigger())) return;

    setApiError(null);
    try {
      // Convert metadata array to Record<string, unknown>
      const metadataRecord = values.metadata.reduce((acc, { key, value }) => {
        acc[key] = value;
        return acc;
      }, {} as Record<string, unknown>);

      const response = await fetch("/api/store/collections", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: values.name,
          metadata: metadataRecord,
        }),
      });

      if (!response.ok) {
        throw new Error(t("collections.error.create"));
      }

      form.reset();
      setOpen(false);
      onCollectionCreated(values.name, metadataRecord);
    } catch (err) {
      setApiError(
        err instanceof Error ? err.message : t("collections.error.create")
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          {tCreate("button")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{tCreate("title")}</DialogTitle>
          <DialogDescription>{tCreate("description")}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{tCreate("name.label")}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={tCreate("name.placeholder")}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <FormLabel>{tCreate("metadata.label")}</FormLabel>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 px-2"
                  onClick={handleAddField}
                  disabled={selectedKeys.length >= METADATA_KEYS.length}
                >
                  <PlusCircle className="h-4 w-4 mr-1" />
                  {tCreate("metadata.addField")}
                </Button>
              </div>

              <div className="space-y-2">
                {fields.map((field, index) => (
                  <div key={field.id} className="flex gap-2 items-start">
                    <FormField
                      control={form.control}
                      name={`metadata.${index}.key`}
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue
                                  placeholder={tCreate(
                                    "metadata.selectPlaceholder"
                                  )}
                                />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {METADATA_KEYS.map((key) => {
                                const isSelected = selectedKeys.includes(
                                  key.value
                                );
                                const isCurrentField =
                                  field.value === key.value;
                                return (
                                  <SelectItem
                                    key={key.value}
                                    value={key.value}
                                    disabled={isSelected && !isCurrentField}
                                  >
                                    {tMetadata(key.label)}
                                    {isSelected &&
                                      !isCurrentField &&
                                      ` (${tCreate("metadata.inUse")})`}
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`metadata.${index}.value`}
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormControl>
                            <Input
                              placeholder={tCreate("metadata.valuePlaceholder")}
                              maxLength={35}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-10 px-2"
                      onClick={() => remove(index)}
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {apiError && <p className="text-sm text-red-500">{apiError}</p>}
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
              >
                {tCreate("cancel")}
              </Button>
              <Button type="submit">{tCreate("submit")}</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
