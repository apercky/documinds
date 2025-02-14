import { CollectionsTab } from "@/components/admin/collections-tab";
import { SettingsTab } from "@/components/admin/settings-tab";
import { UploadTab } from "@/components/admin/upload-tab";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function AdminPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>

      <Tabs defaultValue="collections" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="collections">Collections</TabsTrigger>
          <TabsTrigger value="upload">Upload Documents</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
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
