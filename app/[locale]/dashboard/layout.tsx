import { AppSidebar } from "@/components/app-sidebar";
import { LanguageSelector } from "@/components/layout/language-selector";
import { UserNav } from "@/components/layout/user-nav";
import { ThemeSwitcher } from "@/components/theme-switcher";

import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@radix-ui/react-separator";
import type * as React from "react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <div className="flex w-full h-[calc(100vh-4rem)]">
        <AppSidebar />
        <SidebarInset className="w-ful">
          <header className="flex flex-row w-full shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
            <div className="flex w-full items-center justify-between gap-2 px-4">
              <>
                <SidebarTrigger className="-ml-1" />
                <Separator orientation="vertical" className="mr-2 h-4" />
              </>
              <div className="flex flex-row items-center gap-4">
                <ThemeSwitcher />
                <LanguageSelector />
                <UserNav />
              </div>
            </div>
          </header>

          <main className="flex flex-1 h-[calc(100vh-4rem)] flex-col gap-4 pt-0 p-6 overflow-y-auto bg-background dark:bg-background">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
