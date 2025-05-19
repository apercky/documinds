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
import { ChevronRight, Trash2, type LucideIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
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
    disable?: boolean;
    clearable?: boolean;
    collectionName?: string;
  }[];
}

interface NavMainProps {
  items: NavItem[];
  onClearChat?: (collectionName: string) => void;
}

export function NavMain({ items, onClearChat }: NavMainProps) {
  const locale = useLocale();
  const t = useTranslations("Navigation");
  const [openSections, setOpenSections] = useState<string[]>([]);

  // Update open sections when items change or when an item becomes active
  useEffect(() => {
    const activeSections = items
      .filter(
        (item) =>
          item.isActive || item.items?.some((subItem) => subItem.isActive)
      )
      .map((item) => item.title);

    if (activeSections.length > 0) {
      setOpenSections(activeSections);
    }
  }, [items]);

  // Gestore per il clic sul pulsante cestino
  const handleClearClick = (e: React.MouseEvent, collectionName: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (onClearChat) {
      onClearChat(collectionName);
    }
  };

  return (
    <SidebarGroup>
      <SidebarGroupLabel>{t("platform")}</SidebarGroupLabel>
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
                  {item.items?.map((subItem) => {
                    // Verifica se l'elemento è disabilitato
                    const isDisabled = subItem.disable === true;
                    const isClearable =
                      subItem.clearable === true && Boolean(onClearChat);

                    // Mostra l'elemento solo se non è disabilitato
                    return (
                      <SidebarMenuSubItem key={subItem.title}>
                        <SidebarMenuSubButton
                          asChild
                          className={cn(
                            subItem.isActive &&
                              "bg-accent/50 text-accent-foreground underline underline-offset-4",
                            isDisabled &&
                              "opacity-50 cursor-not-allowed pointer-events-none",
                            "group/nav-item flex items-center justify-between"
                          )}
                        >
                          {isDisabled ? (
                            <span className="text-muted-foreground">
                              {subItem.title}
                            </span>
                          ) : (
                            <div className="flex w-full items-center justify-between">
                              <Link href={subItem.url} className="flex-grow">
                                <span>{subItem.title}</span>
                              </Link>
                              {isClearable && subItem.collectionName && (
                                <button
                                  onClick={(e) =>
                                    handleClearClick(e, subItem.collectionName!)
                                  }
                                  className="ml-2 opacity-0 group-hover/nav-item:opacity-100 transition-opacity p-1 hover:text-red-500"
                                  title={t("clearChat")}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          )}
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    );
                  })}
                </SidebarMenuSub>
              </CollapsibleContent>
            </SidebarMenuItem>
          </Collapsible>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}
