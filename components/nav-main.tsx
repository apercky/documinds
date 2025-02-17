"use client";

import { Link } from "@/app/i18n/routing";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { ChevronRight, type LucideIcon } from "lucide-react";
import { useLocale } from "next-intl";
import { useEffect, useState } from "react";

interface NavItem {
  title: string;
  url: string;
  icon?: LucideIcon;
  isActive?: boolean;
  items?: {
    title: string;
    url: string;
    isActive?: boolean;
  }[];
}

interface NavMainProps {
  items: NavItem[];
}

export function NavMain({ items }: NavMainProps) {
  const locale = useLocale();
  const [openSections, setOpenSections] = useState<string[]>([]);

  // Update open sections when items change or when an item becomes active
  useEffect(() => {
    const activeSections = items
      .filter(
        (item) =>
          item.isActive || item.items?.some((subItem) => subItem.isActive)
      )
      .map((item) => item.title);
    setOpenSections(activeSections);
  }, [items]);

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Platform</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => (
          <Collapsible
            key={item.title}
            asChild
            open={openSections.includes(item.title)}
            onOpenChange={(isOpen) => {
              setOpenSections((prev) =>
                isOpen
                  ? [...prev, item.title]
                  : prev.filter((title) => title !== item.title)
              );
            }}
            className="group/collapsible"
          >
            <SidebarMenuItem>
              <CollapsibleTrigger asChild>
                <SidebarMenuButton
                  tooltip={item.title}
                  className={cn(
                    item.isActive && "text-primary underline underline-offset-4"
                  )}
                >
                  {item.icon && <item.icon />}
                  <span>{item.title}</span>
                  <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                </SidebarMenuButton>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SidebarMenuSub>
                  {item.items?.map((subItem) => (
                    <SidebarMenuSubItem key={subItem.title}>
                      <SidebarMenuSubButton
                        asChild
                        className={cn(
                          subItem.isActive &&
                            "bg-accent/50 text-accent-foreground underline underline-offset-4"
                        )}
                      >
                        <Link href={subItem.url} locale={locale}>
                          <span>{subItem.title}</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  ))}
                </SidebarMenuSub>
              </CollapsibleContent>
            </SidebarMenuItem>
          </Collapsible>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}
