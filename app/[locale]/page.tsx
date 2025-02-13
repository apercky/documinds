"use client";

import { Link } from "@/app/i18n/routing";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import Image from "next/image";

export default function Home() {
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
    <>
      <Header />
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] bg-background text-foreground">
        <motion.main
          variants={container}
          initial="hidden"
          animate="show"
          className="flex flex-col items-center justify-center gap-8 p-8"
        >
          <motion.div variants={item}>
            <Image
              className="dark:invert"
              src="/logo.svg"
              alt="Documinds logo"
              width={180}
              height={38}
              priority
            />
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
            <Link
              href="/dashboard"
              className="relative inline-flex items-center justify-center px-6 py-3 overflow-hidden font-medium transition-all bg-background border border-primary rounded-lg group"
            >
              <span className="absolute inset-0 flex items-center justify-center w-full h-full text-white duration-300 -translate-x-full bg-primary group-hover:translate-x-0 ease">
                <svg
                  className="w-6 h-6 text-background"
                  fill="none"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M14 5l7 7m0 0l-7 7m7-7H3"
                    stroke="currentColor"
                  ></path>
                </svg>
              </span>
              <span className="absolute flex items-center justify-center w-full h-full text-primary transition-all duration-300 transform group-hover:translate-x-full ease">
                {t("gotoDashboard")}
              </span>
              <span className="relative invisible">{t("gotoDashboard")}</span>
            </Link>
          </motion.div>
        </motion.main>
      </div>
      <Footer />
    </>
  );
}
