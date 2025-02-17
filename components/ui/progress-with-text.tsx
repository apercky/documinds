import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface ProgressWithTextProps {
  value: number;
  className?: string;
  status?: string;
}

export function ProgressWithText({
  value,
  className,
  status,
}: ProgressWithTextProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <Progress value={value} className="h-2 w-full" />
      <div className="flex justify-between text-sm text-muted-foreground">
        <span className="truncate pr-2">
          {status || `Processing: ${Math.round(value)}%`}
        </span>
        <span className="font-medium tabular-nums">{Math.round(value)}%</span>
      </div>
    </div>
  );
}
