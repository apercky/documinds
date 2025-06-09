"use client";

import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";

export default function TranslationExample() {
  const t = useTranslations();

  const handleResetCache = async () => {
    try {
      const response = await fetch("/api/messages?action=reset");
      const result = await response.json();

      if (result.success) {
        alert("Translation cache reset successfully!");
        window.location.reload();
      } else {
        alert("Failed to reset cache: " + result.message);
      }
    } catch (error) {
      alert("Error resetting cache: " + error);
    }
  };

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">{t("welcome")}</h1>
      <p>{t("hello")}</p>
      <p>{t("thank_you")}</p>

      <nav className="space-x-4">
        <span className="font-semibold">Navigation:</span>
        <span>{t("navigation.home")}</span>
        <span>{t("navigation.about")}</span>
        <span>{t("navigation.contact")}</span>
        <span>{t("navigation.services")}</span>
      </nav>

      <div className="space-x-2">
        <span className="font-semibold">Forms:</span>
        <span>{t("forms.submit")}</span>
        <span>{t("forms.cancel")}</span>
        <span>{t("forms.save")}</span>
        <span>{t("forms.delete")}</span>
      </div>

      <div className="space-x-2">
        <span className="font-semibold">Errors:</span>
        <span>{t("errors.error_generic")}</span>
        <span>{t("errors.error_not_found")}</span>
        <span>{t("errors.error_unauthorized")}</span>
      </div>

      {/* Cache reset button for development */}
      <div className="mt-8 p-4 bg-gray-100 rounded-lg">
        <h3 className="text-lg font-semibold mb-2">Development Tools</h3>
        <Button onClick={handleResetCache} variant="outline">
          Reset Translation Cache
        </Button>
        <p className="text-sm text-gray-600 mt-2">
          This will clear the translation cache and reload fresh data from the
          database.
        </p>
      </div>
    </div>
  );
}
