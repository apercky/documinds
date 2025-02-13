"use client";

import { ThemeProviderProps } from "next-themes";
import dynamic from "next/dynamic";

const ThemeProviderDynamic = dynamic(
  () => import("next-themes").then((mod) => mod.ThemeProvider),
  { ssr: false }
);

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <ThemeProviderDynamic
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      storageKey="app-theme"
      forcedTheme={props.forcedTheme}
      {...props}
    >
      <div className="contents">{children}</div>
    </ThemeProviderDynamic>
  );
}
