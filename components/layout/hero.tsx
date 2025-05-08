"use client";

import { useRouter } from "@/app/i18n/routing";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { InteractiveHoverButton } from "../magicui/interactive-hover-button";

export function Hero() {
  const router = useRouter();
  const t = useTranslations("HomePage");

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
      },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } },
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-7.5rem)]">
      <motion.main
        variants={container}
        initial="hidden"
        animate="show"
        className="flex flex-col items-center justify-center gap-8"
      >
        <motion.div variants={item}>
          <div
            style={{ position: "relative", width: "140px", height: "140px" }}
          >
            <Image
              className="dark:invert"
              src="/logo.svg"
              alt="Documinds logo"
              fill
              style={{ objectFit: "contain" }}
              priority
            />
          </div>
        </motion.div>
        <motion.h1
          variants={item}
          className="text-4xl font-bold tracking-tight text-center bg-clip-text text-transparent bg-gradient-to-r from-primary via-purple-500 to-pink-600 dark:from-primary dark:via-purple-400 dark:to-pink-500 animate-gradient-x"
          style={{
            backgroundSize: "200% auto",
          }}
        >
          {t("title")}
        </motion.h1>
        <motion.h2
          variants={item}
          className="text-muted-foreground text-center text-sm max-w-2xl leading-relaxed"
        >
          {t("subtitle")}
        </motion.h2>
        <motion.div
          variants={item}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <div className="flex items-center justify-center pb-4">
            <InteractiveHoverButton
              onClick={() => router.push("/dashboard")}
              className=" items-center justify-center px-10 py-3 overflow-hidden font-medium transition-all bg-background text-foreground border border-primary rounded-lg group"
            >
              {t("gotoDashboard")}
            </InteractiveHoverButton>
          </div>
        </motion.div>
      </motion.main>
    </div>
  );
}
