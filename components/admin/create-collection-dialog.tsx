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
import { Textarea } from "@/components/ui/textarea";
import { AttributeType } from "@/lib/prisma/generated";
import {
  CreateCollectionRequest,
  CreateCollectionSchema,
} from "@/lib/schemas/collection.schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { PlusCircle, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";

interface CreateCollectionDialogProps {
  onCollectionCreated: (collection: {
    id: string;
    name: string;
    description: string | null;
  }) => void;
}

export function CreateCollectionDialog({
  onCollectionCreated,
}: CreateCollectionDialogProps) {
  const [open, setOpen] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const t = useTranslations();
  const tCreate = useTranslations("createCollection");

  const form = useForm<CreateCollectionRequest>({
    resolver: zodResolver(CreateCollectionSchema),
    defaultValues: {
      name: "",
      description: "",
      attributes: [],
    },
    mode: "onChange",
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "attributes",
  });

  // Get all currently selected types
  const selectedTypes =
    form.watch("attributes")?.map((item) => item.type) || [];

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen) {
      form.reset();
      setApiError(null);
    }
  };

  // Find the first available attribute type that hasn't been used
  const getNextAvailableType = () => {
    const allTypes = Object.values(AttributeType);
    return (
      allTypes.find((type) => !selectedTypes.includes(type)) || allTypes[0]
    );
  };

  const handleAddField = () => {
    const nextType = getNextAvailableType();
    append({ type: nextType, value: "" });
  };

  const handleSubmit = async (values: CreateCollectionRequest) => {
    setApiError(null);
    try {
      const response = await fetch("/api/store/collections", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        // Extract the error message from the response
        const errorData = await response.json();
        throw new Error(errorData.error || t("collections.error.create"));
      }

      const collection = await response.json();
      form.reset();
      setOpen(false);
      onCollectionCreated(collection);
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
          <DialogTitle>{tCreate("dialogTitle")}</DialogTitle>
          <DialogDescription>{tCreate("dialogDescription")}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center">
                    {tCreate("name.label")}
                    <span className="text-destructive ml-1">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder={
                        tCreate("name.placeholder") ||
                        "Insert the collection name..."
                      }
                      {...field}
                      aria-required="true"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{tCreate("description.label")}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={
                        tCreate("description.placeholder") ||
                        "Add a description for the collection..."
                      }
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <FormLabel>{tCreate("attributes.label")}</FormLabel>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 px-2"
                  onClick={handleAddField}
                  disabled={
                    selectedTypes.length >= Object.keys(AttributeType).length
                  }
                >
                  <PlusCircle className="h-4 w-4 mr-1" />
                  {tCreate("attributes.addField")}
                </Button>
              </div>

              <div className="space-y-2">
                {fields.map((field, index) => (
                  <div key={field.id} className="flex gap-2 items-start">
                    <FormField
                      control={form.control}
                      name={`attributes.${index}.type`}
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
                                    "attributes.typePlaceholder"
                                  )}
                                />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {Object.values(AttributeType).map((type) => {
                                const isSelected = selectedTypes.includes(type);
                                const isCurrentField = field.value === type;
                                return (
                                  <SelectItem
                                    key={type}
                                    value={type}
                                    disabled={isSelected && !isCurrentField}
                                  >
                                    {type}
                                    {isSelected &&
                                      !isCurrentField &&
                                      ` (${tCreate("attributes.inUse")})`}
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
                      name={`attributes.${index}.value`}
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormControl>
                            <Input
                              placeholder={
                                tCreate("attributes.valuePlaceholder") ||
                                "Value"
                              }
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
