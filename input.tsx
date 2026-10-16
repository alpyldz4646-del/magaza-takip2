import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return (
      <input
        ref={ref}
        className={cn(
          "flex h-11 w-full rounded-lg border border-line bg-surface-2 px-3 text-sm text-ink outline-none transition-[box-shadow,border-color] duration-[var(--motion-quick)] placeholder:text-subtle focus-visible:border-primary/40 focus-visible:ring-2 focus-visible:ring-primary/20 disabled:opacity-50",
          className,
        )}
        {...props}
      />
    );
  },
);
