import { LanguageSelector } from "@/components/layout/language-selector";

import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@radix-ui/react-dropdown-menu";
import { BarChart, Globe, Home, Settings, User, Users } from "lucide-react";
import Image from "next/image";
import type * as React from "react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const navItems = [
    { icon: Home, label: "Home", href: "/" },
    { icon: Users, label: "Users", href: "/users" },
    { icon: BarChart, label: "Analytics", href: "/analytics" },
    { icon: Settings, label: "Settings", href: "/settings" },
  ];

  return (
    <>
      <SidebarProvider>
        <div className="flex h-screen flex-col">
          <header className="flex h-16 items-center justify-between border-b px-4 lg:px-6">
            <div className="flex items-center gap-4">
              <Image
                src="/logo.svg"
                alt="Logo"
                className="h-8 w-auto"
                width={32}
                height={32}
              />
              <SidebarTrigger />
            </div>
            <div className="flex items-center gap-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Globe className="h-5 w-5" />
                    <span className="sr-only">Change Language</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => {
                      /* Change language logic */
                    }}
                  >
                    English
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      /* Change language logic */
                    }}
                  >
                    Español
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <LanguageSelector />

              <Button variant="ghost" size="icon">
                <User className="h-5 w-5" />
                <span className="sr-only">Account</span>
              </Button>
            </div>
          </header>
          <div className="flex flex-1 overflow-hidden">
            <Sidebar className="border-r">
              <SidebarHeader className="flex items-center justify-between p-4">
                <h2 className="text-lg font-semibold">Navigation</h2>
              </SidebarHeader>
              <SidebarContent>
                <SidebarMenu>
                  {navItems.map((item) => (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton asChild>
                        <a
                          href={item.href}
                          className="flex items-center gap-3 px-3 py-2"
                        >
                          <item.icon className="h-5 w-5" />
                          <span>{item.label}</span>
                        </a>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarContent>
            </Sidebar>
            <main className="flex-1 overflow-y-auto p-6">{children}</main>
          </div>
        </div>
      </SidebarProvider>
    </>
  );
}
