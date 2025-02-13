"use client";

import { Link } from "@/app/i18n/routing";
import { LanguageSelector } from "@/components/layout/language-selector";
import { UserNav } from "@/components/layout/user-nav";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { motion } from "framer-motion";
import { useLocale } from "next-intl";
import Image from "next/image";

export function Header() {
  const locale = useLocale();

  const letterVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.1,
      },
    }),
  };

  const letters = "DOCUMINDS".split("");

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-muted/40 dark:bg-muted/40 shadow-md backdrop-blur-xl">
      <div className="container flex h-20 items-center">
        <div className="p-4 flex">
          <Link
            href="/"
            locale={locale}
            className="mr-6 flex items-center space-x-2 group"
          >
            <Image
              src="/logo.svg"
              alt="Logo"
              className="h-8 w-8 dark:invert"
              width={48}
              height={48}
            />
            <motion.div className="flex overflow-hidden">
              {letters.map((letter, i) => (
                <motion.span
                  key={i}
                  custom={i}
                  variants={letterVariants}
                  initial="hidden"
                  animate="visible"
                  className="font-bold text-2xl bg-clip-text text-transparent bg-gradient-to-r from-primary via-gray-600 to-purple-800 dark:from-primary dark:via-purple-300 dark:to-gray-200 animate-gradient-x"
                  style={{
                    backgroundSize: "400% auto",
                  }}
                >
                  {letter}
                </motion.span>
              ))}
            </motion.div>
          </Link>
        </div>
        <div className="flex w-full items-center justify-between space-x-2 md:justify-end">
          <div className="w-full flex-1  md:w-auto md:flex-none">
            {/* Search will go here */}
          </div>
          <nav className="flex items-center space-x-2">
            <ThemeSwitcher />
            <LanguageSelector />
            <UserNav />
          </nav>
        </div>
      </div>
    </header>
  );
}
