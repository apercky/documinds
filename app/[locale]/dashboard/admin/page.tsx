import { CollectionsTab } from "@/components/admin/collections-tab";
import { SettingsTab } from "@/components/admin/settings-tab";
import { UploadTab } from "@/components/admin/upload-tab";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTranslations } from "next-intl";

export default function AdminPage() {
  const t = useTranslations("AdminDashboard");

  return (
    <div className="container mx-auto py-8 flex flex-col gap-4 px-8 overflow-auto">
      <h1 className="text-3xl font-bold mb-8">{t("title")}</h1>

      <Tabs defaultValue="collections" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="collections">{t("tabs.collections")}</TabsTrigger>
          <TabsTrigger value="upload">{t("tabs.upload")}</TabsTrigger>
          <TabsTrigger value="settings">{t("tabs.settings")}</TabsTrigger>
        </TabsList>

        <TabsContent value="collections">
          <CollectionsTab />
        </TabsContent>

        <TabsContent value="upload">
          <UploadTab />
        </TabsContent>

        <TabsContent value="settings">
          <SettingsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
