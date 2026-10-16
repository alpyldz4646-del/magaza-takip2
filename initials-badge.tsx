import { initialsFrom } from "@/lib/format";
import { cn } from "@/lib/utils";

export function InitialsBadge({
  name,
  initials,
  size = "sm",
  className,
}: {
  name: string;
  initials?: string;
  size?: "sm" | "md";
  className?: string;
}) {
  if (!name.trim()) return null;
  const text = (initials || initialsFrom(name)).trim();
  if (!text) return null;
  return (
    <span
      title={name}
      aria-hidden
      className={cn(
        "grid shrink-0 place-items-center rounded-full bg-primary font-semibold text-primary-fg ring-2 ring-bg",
        size === "md" ? "size-11 text-sm" : "size-7 text-xs",
        className,
      )}
    >
      {text}
    </span>
  );
}
