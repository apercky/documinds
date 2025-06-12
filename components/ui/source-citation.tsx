"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { SourceCitation } from "@/lib/utils/source-citations";
import { FileText } from "lucide-react";

interface SourceCitationBadgeProps {
  citation: SourceCitation;
  number: number;
  className?: string;
}

export function SourceCitationBadge({
  citation,
  number,
  className,
}: SourceCitationBadgeProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn(
            "inline-flex items-center justify-center w-4 h-4 text-xs font-medium text-white bg-slate-500 rounded-full cursor-pointer hover:bg-slate-300 transition-colors",
            className
          )}
        >
          {number}
        </span>
      </TooltipTrigger>
      <TooltipContent
        className="z-50 overflow-hidden rounded-md bg-popover px-3 py-2 text-sm text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95"
        sideOffset={5}
      >
        <div className="flex items-start gap-2">
          <FileText className="w-4 h-4 mt-0.5 text-muted-foreground" />
          <div className="space-y-1">
            <p className="font-medium text-sm">{citation.filename}</p>
            <p className="text-xs text-muted-foreground">
              Page {citation.page} of {citation.totalPages}
            </p>
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
