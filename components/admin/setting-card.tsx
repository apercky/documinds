"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SettingKey } from "@/lib/prisma/generated";
import {
  Brain,
  Database,
  Eye,
  EyeOff,
  Lock,
  MessageSquare,
  Save,
  Workflow,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

interface SettingCardProps {
  title: string;
  description: string;
  settingKey: SettingKey;
  isEncrypted: boolean;
  companyName: string;
  currentValue?: string;
  hasValue: boolean;
  onUpdate: (settingKey: SettingKey, value: string) => Promise<void>;
}

const getSettingIcon = (settingKey: SettingKey) => {
  switch (settingKey) {
    case SettingKey.OPENAI_API_KEY:
      return Brain;
    case SettingKey.LANGFLOW_API_KEY:
      return Workflow;
    case SettingKey.LANGFLOW_FLOW_CHAT_ID:
      return MessageSquare;
    case SettingKey.LANGFLOW_FLOW_EMBEDDINGS_ID:
      return Database;
    default:
      return Lock;
  }
};

const getPlaceholder = (
  settingKey: SettingKey,
  isEncrypted: boolean,
  t: any
) => {
  if (isEncrypted) {
    return t("placeholders.apiKey");
  }

  switch (settingKey) {
    case SettingKey.LANGFLOW_FLOW_CHAT_ID:
      return t("placeholders.chatFlowId");
    case SettingKey.LANGFLOW_FLOW_EMBEDDINGS_ID:
      return t("placeholders.embeddingsFlowId");
    default:
      return t("placeholders.default");
  }
};

export function SettingCard({
  title,
  description,
  settingKey,
  isEncrypted,
  companyName,
  currentValue,
  hasValue,
  onUpdate,
}: SettingCardProps) {
  const t = useTranslations("SettingCard");
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState("");
  const [showValue, setShowValue] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const Icon = getSettingIcon(settingKey);

  const handleEdit = () => {
    setIsEditing(true);
    setValue(isEncrypted ? "" : currentValue || "");
  };

  const handleCancel = () => {
    setIsEditing(false);
    setValue("");
    setShowValue(false);
  };

  const handleSave = async () => {
    if (!value.trim()) return;

    setIsLoading(true);
    try {
      await onUpdate(settingKey, value.trim());
      setIsEditing(false);
      setValue("");
      setShowValue(false);
    } catch (error) {
      console.error("Failed to save setting:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const displayValue = () => {
    if (!hasValue) return t("notConfigured");
    if (isEncrypted) return "••••••••";
    return currentValue || t("notConfigured");
  };

  return (
    <Card className="relative">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-lg">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          {isEncrypted && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Lock className="h-3 w-3" />
              {t("encrypted")}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label
            htmlFor={`setting-${settingKey}`}
            className="text-sm font-medium"
          >
            {t("currentValue")}
          </Label>
          {isEditing ? (
            <div className="space-y-3">
              <div className="relative">
                <Input
                  id={`setting-${settingKey}`}
                  type={isEncrypted && !showValue ? "password" : "text"}
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder={getPlaceholder(settingKey, isEncrypted, t)}
                  className="pr-10"
                />
                {isEncrypted && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowValue(!showValue)}
                  >
                    {showValue ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleSave}
                  disabled={!value.trim() || isLoading}
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <Save className="h-3 w-3" />
                  {isLoading ? t("saving") : t("save")}
                </Button>
                <Button
                  onClick={handleCancel}
                  variant="outline"
                  size="sm"
                  disabled={isLoading}
                >
                  {t("cancel")}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-md border bg-muted/50 px-3 py-2">
                <span className="text-sm font-mono">{displayValue()}</span>
                <Button onClick={handleEdit} variant="outline" size="sm">
                  {hasValue ? t("update") : t("configure")}
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="text-xs text-muted-foreground">
          <p>
            <strong>{t("company")}:</strong> {companyName}
          </p>
          {isEncrypted && <p className="mt-1">{t("encryptedNote")}</p>}
          {!isEncrypted && settingKey.includes("FLOW") && (
            <p className="mt-1">{t("flowIdNote")}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
