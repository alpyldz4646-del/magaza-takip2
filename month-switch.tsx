import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { monthName, shiftMonth, yearChoices } from "@/lib/format";

export function MonthSwitch({
  month,
  onChange,
}: {
  month: string;
  onChange: (month: string) => void;
}) {
  const year = month.slice(0, 4);
  const years = yearChoices(month);

  return (
    <div className="inline-flex items-center gap-1 rounded-xl bg-bg-warm p-1">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-9"
        onClick={() => onChange(shiftMonth(month, -1))}
        aria-label="Önceki ay"
      >
        <ChevronLeft />
      </Button>
      <select
        aria-label="Yıl seç"
        className="h-9 rounded-lg bg-transparent px-2 text-sm font-medium text-ink"
        value={year}
        onChange={(event) => onChange(`${event.target.value}-${month.slice(5, 7)}`)}
      >
        {years.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </select>
      <span className="min-w-16 px-1 text-center text-sm font-medium capitalize">
        {monthName(month)}
      </span>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-9"
        onClick={() => onChange(shiftMonth(month, 1))}
        aria-label="Sonraki ay"
      >
        <ChevronRight />
      </Button>
    </div>
  );
}
