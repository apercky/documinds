"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Circle } from "lucide-react";

function ElegantShape({
  className,
  delay = 0,
  width = 400,
  height = 100,
  rotate = 0,
  gradient = "from-white/[0.08]",
  isLight = false,
}: {
  className?: string;
  delay?: number;
  width?: number;
  height?: number;
  rotate?: number;
  gradient?: string;
  isLight?: boolean;
}) {
  return (
    <motion.div
      initial={{
        opacity: 0,
        y: -150,
        rotate: rotate - 15,
      }}
      animate={{
        opacity: 1,
        y: 0,
        rotate: rotate,
      }}
      transition={{
        duration: 2.4,
        delay,
        ease: [0.23, 0.86, 0.39, 0.96],
        opacity: { duration: 1.2 },
      }}
      className={cn("absolute", className)}
    >
      <motion.div
        animate={{
          y: [0, 15, 0],
        }}
        transition={{
          duration: 12,
          repeat: Number.POSITIVE_INFINITY,
          ease: "easeInOut",
        }}
        style={{
          width,
          height,
        }}
        className="relative"
      >
        <div
          className={cn(
            "absolute inset-0 rounded-full",
            "bg-gradient-to-r to-transparent",
            gradient,
            isLight
              ? [
                  "backdrop-blur-[2px] border-2 border-purple-200/30",
                  "shadow-[0_8px_32px_0_rgba(168,85,247,0.05)]",
                  "after:absolute after:inset-0 after:rounded-full",
                  "after:bg-[radial-gradient(circle_at_50%_50%,rgba(168,85,247,0.1),transparent_70%)]",
                ]
              : [
                  "backdrop-blur-[2px] border-2 border-white/[0.15]",
                  "shadow-[0_8px_32px_0_rgba(255,255,255,0.1)]",
                  "after:absolute after:inset-0 after:rounded-full",
                  "after:bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.2),transparent_70%)]",
                ]
          )}
        />
      </motion.div>
    </motion.div>
  );
}

function HeroGeometric({
  badge = "",
  children,
}: {
  badge?: string;
  children?: React.ReactNode;
}) {
  const fadeUpVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        duration: 1,
        delay: 0.5 + i * 0.2,
        ease: [0.25, 0.4, 0.25, 1],
      },
    }),
  };

  return (
    <div className="relative w-full flex items-center justify-center overflow-hidden bg-background text-foreground">
      <div className="absolute inset-0 bg-gradient-to-br from-purple-200/30 via-purple-100/20 to-primary/[0.05] dark:from-indigo-500/[0.05] dark:via-transparent dark:to-rose-500/[0.05] blur-3xl" />

      <div className="absolute inset-0 overflow-hidden">
        <ElegantShape
          delay={0.3}
          width={600}
          height={140}
          rotate={12}
          gradient="from-purple-300/[0.15] dark:from-indigo-500/[0.15]"
          className="left-[-10%] md:left-[-5%] top-[15%] md:top-[20%]"
          isLight
        />

        <ElegantShape
          delay={0.5}
          width={500}
          height={120}
          rotate={-15}
          gradient="from-primary/[0.12] via-purple-200/[0.1] dark:from-rose-500/[0.15]"
          className="right-[-5%] md:right-[0%] top-[70%] md:top-[75%]"
          isLight
        />

        <ElegantShape
          delay={0.4}
          width={300}
          height={80}
          rotate={-8}
          gradient="from-secondary/[0.15] via-purple-100/[0.15] dark:from-violet-500/[0.15]"
          className="left-[5%] md:left-[10%] bottom-[5%] md:bottom-[10%]"
          isLight
        />

        <ElegantShape
          delay={0.6}
          width={200}
          height={60}
          rotate={20}
          gradient="from-purple-200/[0.2] to-accent/[0.1] dark:from-amber-500/[0.15]"
          className="right-[15%] md:right-[20%] top-[10%] md:top-[15%]"
          isLight
        />

        <ElegantShape
          delay={0.7}
          width={150}
          height={40}
          rotate={-25}
          gradient="from-purple-100/[0.25] to-ring/[0.1] dark:from-cyan-500/[0.15]"
          className="left-[20%] md:left-[25%] top-[5%] md:top-[10%]"
          isLight
        />
      </div>

      <div className="relative z-10 container mx-auto px-4 md:px-6">
        <div className="max-w-3xl mx-auto text-center">
          {badge && (
            <motion.div
              custom={0}
              variants={fadeUpVariants}
              initial="hidden"
              animate="visible"
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-100/50 dark:bg-white/[0.03] border border-purple-200 dark:border-white/[0.08] mb-8 md:mb-12"
            >
              <Circle className="h-2 w-2 fill-purple-400 dark:fill-rose-500/80" />
              <span className="text-sm text-foreground/60 dark:text-white/60 tracking-wide">
                {badge}
              </span>
            </motion.div>
          )}

          <motion.div
            custom={1}
            variants={fadeUpVariants}
            initial="hidden"
            animate="visible"
          >
            {children}
          </motion.div>
        </div>
      </div>

      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/5 to-background/80 dark:from-[#030303] dark:via-transparent dark:to-[#030303]/80 pointer-events-none" />
    </div>
  );
}

export { HeroGeometric };
