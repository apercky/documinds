import { CollectionsTab } from "@/components/admin/collections-tab";
import { SettingsTab } from "@/components/admin/settings-tab";
import { UploadTab } from "@/components/admin/upload-tab";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTranslations } from "next-intl";

export default function AdminPage() {
  const t = useTranslations("AdminDashboard");

  return (
    <div className="h-full flex flex-col">
      <div className="w-full px-4 pt-8">
        <h1 className="text-3xl font-bold mb-8">{t("title")}</h1>

        <Tabs defaultValue="collections" className="w-full ">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="collections">
              {t("tabs.collections")}
            </TabsTrigger>
            <TabsTrigger value="upload">{t("tabs.upload")}</TabsTrigger>
            <TabsTrigger value="settings">{t("tabs.settings")}</TabsTrigger>
          </TabsList>

          <div className="h-[calc(100vh-204px)] overflow-auto scrollbar-hide">
            <TabsContent value="collections" className="h-full">
              <CollectionsTab />
            </TabsContent>

            <TabsContent value="upload" className="h-full">
              <UploadTab />
            </TabsContent>

            <TabsContent value="settings" className="h-full">
              <SettingsTab />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
