import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-2xl bg-surface p-5 text-ink shadow-[var(--shadow-card)]",
        className,
      )}
      {...props}
    />
  );
}
