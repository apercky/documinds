import { AppSidebar } from "@/components/app-sidebar";
import { LanguageSelector } from "@/components/layout/language-selector";
import { UserNav } from "@/components/layout/user-nav";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { auth } from "@/lib/auth";

import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@radix-ui/react-separator";

import { redirect } from "@/app/i18n/routing";
import type * as React from "react";

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const session = await auth();
  const { locale } = await params;

  if (!session) {
    // 👇 Redirect al tuo provider direttamente
    redirect({ href: "/login", locale }); // oppure a una pagina tipo /login se preferisci
  }

  return (
    <SidebarProvider>
      <div className="flex w-full h-[calc(100vh)] max-h-[calc(100vh)]">
        <AppSidebar />
        <SidebarInset className="w-full">
          <header className="flex flex-row w-full shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
            <div className="flex w-full items-center justify-between gap-2 px-4 py-1.5 bg-background/80 backdrop-blur-sm border-b dark:border-slate-800 dark:bg-background/70">
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

          <main className="flex flex-1 flex-col h-[calc(100vh-4rem-48px)] overflow-hidden">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
