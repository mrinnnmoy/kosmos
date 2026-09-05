import * as React from "react";
import { cn } from "@/lib/utils";

type BadgeTone = "default" | "success" | "danger" | "warning";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
}

export function Badge({ className, tone = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
        {
          "bg-border text-foreground": tone === "default",
          "bg-success/15 text-success": tone === "success",
          "bg-danger/15 text-danger": tone === "danger",
          "bg-warning/15 text-warning": tone === "warning",
        },
        className,
      )}
      {...props}
    />
  );
}
