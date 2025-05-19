import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface LoadingIndicatorProps {
  text?: string;
  className?: string;
  iconClassName?: string;
}

export function LoadingIndicator({
  text = "Loading...",
  className,
  iconClassName,
}: LoadingIndicatorProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3",
        className
      )}
    >
      <div className="relative">
        <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-primary/80 via-primary to-primary/80 opacity-75 blur-sm animate-pulse" />
        <div className="relative rounded-full bg-background p-2">
          <Loader2
            className={cn(
              "h-6 w-6 animate-spin text-primary",
              "animate-[spin_1s_ease-in-out_infinite]",
              iconClassName
            )}
          />
        </div>
      </div>
      <span className="text-sm font-medium bg-gradient-to-r from-primary/80 via-primary to-primary/80 bg-clip-text text-transparent animate-pulse">
        {text}
      </span>
    </div>
  );
}
