import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface AnimatedTextProps {
  text: string;
  className?: string;
}

export function AnimatedText({ text, className }: AnimatedTextProps) {
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

  const letters = text.split("");

  return (
    <motion.div className="flex">
      {letters.map((letter, i) => (
        <motion.span
          key={i}
          custom={i}
          variants={letterVariants}
          initial="hidden"
          animate="visible"
          className={cn("font-bold text-2xl ", className)}
          style={{
            backgroundSize: "400% auto",
          }}
        >
          {letter}
        </motion.span>
      ))}
    </motion.div>
  );
}
