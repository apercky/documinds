"use client";

import { BookOpen, Settings2, SquareTerminal } from "lucide-react";
import type * as React from "react";

import { NavUser } from "./nav-user";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { useLocale } from "next-intl";
import Image from "next/image";
import Link from "next/link";
import { AnimatedText } from "./animated-text";
import { NavMain } from "./nav-main";

// This is sample data.
const data = {
  user: {
    name: "Antonio Perchinumio",
    email: "antonio_perchinumio@otb.net",
    avatar: "/avatars/shadcn.jpg",
  },
  navMain: [
    {
      title: "Collections",
      url: "#",
      icon: SquareTerminal,
      isActive: true,
      items: [
        {
          title: "OneStore",
          url: "/dashboard",
        },
        {
          title: "RBO",
          url: "/dashboard",
        },
        {
          title: "Clienteling",
          url: "/dashboard",
        },
      ],
    },

    {
      title: "Documentation",
      url: "#",
      icon: BookOpen,
      items: [
        {
          title: "Introduction",
          url: "/dashboard",
        },
        {
          title: "Get Started",
          url: "/dashboard",
        },
        {
          title: "Tutorials",
          url: "/dashboard",
        },
        {
          title: "Changelog",
          url: "/dashboard",
        },
      ],
    },
    {
      title: "Settings",
      url: "#",
      icon: Settings2,
      items: [
        {
          title: "General",
          url: "/dashboard/admin",
        },
        {
          title: "Team",
          url: "/dashboard/admin",
        },
        {
          title: "Billing",
          url: "/dashboard/admin",
        },
        {
          title: "Limits",
          url: "/dashboard/admin",
        },
      ],
    },
  ],
  // projects: [
  //   {
  //     name: "Design Engineering",
  //     url: "#",
  //     icon: Frame,
  //   },
  //   {
  //     name: "Sales & Marketing",
  //     url: "#",
  //     icon: PieChart,
  //   },
  //   {
  //     name: "Travel",
  //     url: "#",
  //     icon: Map,
  //   },
  // ],
};

function SidebarLogo() {
  const { state } = useSidebar();
  const locale = useLocale();

  return (
    <Link
      href="/"
      locale={locale}
      className={cn(
        "flex items-center group",
        state === "expanded" ? "mr-6 space-x-2" : "justify-center w-full"
      )}
    >
      <Image
        src="/logo.svg"
        alt="Logo"
        className="h-12 w-12 dark:invert"
        width={48}
        height={48}
      />
      {state === "expanded" && (
        <AnimatedText text="DOCUMINDS" className="text-1xl pl-2" />
      )}
    </Link>
  );
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarLogo />
      </SidebarHeader>
      <SidebarContent>
        {/* <NavProjects projects={data.projects} /> */}
        <NavMain items={data.navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
