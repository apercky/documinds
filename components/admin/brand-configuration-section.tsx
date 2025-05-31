"use client";

import { SettingCard } from "@/components/admin/setting-card";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LoadingIndicator } from "@/components/ui/loading-indicator";
import { SettingKey } from "@prisma/client";
import { AlertCircle, Building2, CheckCircle2, Shield } from "lucide-react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

interface Company {
  id: number;
  name: string;
  description?: string;
  brandCode: string;
  settingsCount: number;
}

interface Setting {
  settingKey: SettingKey;
  value: string;
  isEncrypted: boolean;
  hasValue: boolean;
  updatedAt: Date;
  lastModifiedBy: string;
}

interface BrandValidationState {
  isLoading: boolean;
  isValid: boolean;
  company: Company | null;
  error: string | null;
}

interface SettingsState {
  isLoading: boolean;
  settings: Setting[];
  error: string | null;
}

export function BrandConfigurationSection() {
  const t = useTranslations("BrandConfiguration");

  const [brandValidation, setBrandValidation] = useState<BrandValidationState>({
    isLoading: true,
    isValid: false,
    company: null,
    error: null,
  });

  const [settingsState, setSettingsState] = useState<SettingsState>({
    isLoading: false,
    settings: [],
    error: null,
  });

  // Get brand from user session
  const { data: session } = useSession();
  const userBrand = session?.user?.brand;

  useEffect(() => {
    if (userBrand) {
      validateBrand();
    } else {
      setBrandValidation({
        isLoading: false,
        isValid: false,
        company: null,
        error: t("errors.noBrandInSession"),
      });
    }
  }, [userBrand]);

  const validateBrand = async () => {
    if (!userBrand) return;

    try {
      setBrandValidation((prev) => ({ ...prev, isLoading: true, error: null }));

      const response = await fetch(
        `/api/companies/validate?brand=${userBrand}`
      );
      const data = await response.json();

      if (!response.ok) {
        setBrandValidation({
          isLoading: false,
          isValid: false,
          company: null,
          error: data.message || t("errors.brandValidationFailed"),
        });
        return;
      }

      setBrandValidation({
        isLoading: false,
        isValid: true,
        company: data.company,
        error: null,
      });

      // Load settings after successful brand validation
      loadSettings(data.company.brandCode);
    } catch (error) {
      setBrandValidation({
        isLoading: false,
        isValid: false,
        company: null,
        error: t("errors.failedToValidate"),
      });
    }
  };

  const loadSettings = async (brandCode: string) => {
    try {
      setSettingsState((prev) => ({ ...prev, isLoading: true, error: null }));

      const response = await fetch(`/api/settings/${brandCode}`);
      const data = await response.json();

      if (!response.ok) {
        setSettingsState({
          isLoading: false,
          settings: [],
          error: data.message || t("errors.failedToLoadSettings"),
        });
        return;
      }

      setSettingsState({
        isLoading: false,
        settings: data.settings,
        error: null,
      });
    } catch (error) {
      setSettingsState({
        isLoading: false,
        settings: [],
        error: t("errors.failedToLoadSettings"),
      });
    }
  };

  const handleSettingUpdate = async (settingKey: SettingKey, value: string) => {
    if (!brandValidation.company) return;

    try {
      const response = await fetch(
        `/api/settings/${brandValidation.company.brandCode}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            settingKey,
            value,
          }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || t("errors.failedToUpdateSetting"));
      }

      // Reload settings after successful update
      loadSettings(brandValidation.company.brandCode);
    } catch (error) {
      console.error("Failed to update setting:", error);
      // You could show a toast notification here
    }
  };

  // Loading state
  if (brandValidation.isLoading) {
    return (
      <div className="space-y-6">
        <LoadingIndicator text={t("validatingBrand")} className="py-8" />
      </div>
    );
  }

  // Invalid brand state
  if (!brandValidation.isValid || !brandValidation.company) {
    return (
      <div className="space-y-6">
        <Card className="border-destructive">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <CardTitle className="text-destructive">
                {t("brandNotSupported.title")}
              </CardTitle>
            </div>
            <CardDescription>
              {brandValidation.error || t("brandNotSupported.description")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                <strong>{t("brandNotSupported.brandCode")}</strong>{" "}
                {userBrand || t("brandNotSupported.notAvailable")}
              </p>
              <p className="text-sm text-muted-foreground">
                {t("brandNotSupported.contactAdmin")}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Brand Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Building2 className="h-6 w-6 text-primary" />
              <div>
                <CardTitle>{t("title")}</CardTitle>
                <CardDescription>
                  {t("description", {
                    companyName: brandValidation.company.name,
                  })}
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                {t("verifiedBrand")}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h4 className="text-sm font-medium text-muted-foreground">
                {t("company")}
              </h4>
              <p className="text-sm font-medium">
                {brandValidation.company.name}
              </p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-muted-foreground">
                {t("brandCode")}
              </h4>
              <p className="text-sm font-medium font-mono">
                {brandValidation.company.brandCode}
              </p>
            </div>
            {brandValidation.company.description && (
              <div className="md:col-span-2">
                <h4 className="text-sm font-medium text-muted-foreground">
                  {t("companyDescription")}
                </h4>
                <p className="text-sm">{brandValidation.company.description}</p>
              </div>
            )}
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
            <Shield className="h-3 w-3" />
            {t("securityNote")}
          </div>
        </CardContent>
      </Card>

      {/* Settings Loading */}
      {settingsState.isLoading && (
        <LoadingIndicator text={t("loadingSettings")} className="py-4" />
      )}

      {/* Settings Error */}
      {settingsState.error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">{settingsState.error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Configuration Cards */}
      {!settingsState.isLoading && !settingsState.error && (
        <div className="grid gap-6 md:grid-cols-2">
          <SettingCard
            title={t("settings.openaiApiKey.title")}
            description={t("settings.openaiApiKey.description")}
            settingKey={SettingKey.OPENAI_API_KEY}
            isEncrypted={true}
            companyName={brandValidation.company.name}
            currentValue={
              settingsState.settings.find(
                (s) => s.settingKey === SettingKey.OPENAI_API_KEY
              )?.value
            }
            hasValue={
              settingsState.settings.find(
                (s) => s.settingKey === SettingKey.OPENAI_API_KEY
              )?.hasValue || false
            }
            onUpdate={handleSettingUpdate}
          />

          <SettingCard
            title={t("settings.langflowApiKey.title")}
            description={t("settings.langflowApiKey.description")}
            settingKey={SettingKey.LANGFLOW_API_KEY}
            isEncrypted={true}
            companyName={brandValidation.company.name}
            currentValue={
              settingsState.settings.find(
                (s) => s.settingKey === SettingKey.LANGFLOW_API_KEY
              )?.value
            }
            hasValue={
              settingsState.settings.find(
                (s) => s.settingKey === SettingKey.LANGFLOW_API_KEY
              )?.hasValue || false
            }
            onUpdate={handleSettingUpdate}
          />

          <SettingCard
            title={t("settings.chatFlowId.title")}
            description={t("settings.chatFlowId.description", {
              companyName: brandValidation.company.name,
            })}
            settingKey={SettingKey.LANGFLOW_FLOW_CHAT_ID}
            isEncrypted={false}
            companyName={brandValidation.company.name}
            currentValue={
              settingsState.settings.find(
                (s) => s.settingKey === SettingKey.LANGFLOW_FLOW_CHAT_ID
              )?.value
            }
            hasValue={
              settingsState.settings.find(
                (s) => s.settingKey === SettingKey.LANGFLOW_FLOW_CHAT_ID
              )?.hasValue || false
            }
            onUpdate={handleSettingUpdate}
          />

          <SettingCard
            title={t("settings.embeddingsFlowId.title")}
            description={t("settings.embeddingsFlowId.description", {
              companyName: brandValidation.company.name,
            })}
            settingKey={SettingKey.LANGFLOW_FLOW_EMBEDDINGS_ID}
            isEncrypted={false}
            companyName={brandValidation.company.name}
            currentValue={
              settingsState.settings.find(
                (s) => s.settingKey === SettingKey.LANGFLOW_FLOW_EMBEDDINGS_ID
              )?.value
            }
            hasValue={
              settingsState.settings.find(
                (s) => s.settingKey === SettingKey.LANGFLOW_FLOW_EMBEDDINGS_ID
              )?.hasValue || false
            }
            onUpdate={handleSettingUpdate}
          />
        </div>
      )}
    </div>
  );
}
