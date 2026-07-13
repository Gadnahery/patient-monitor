import { ActivitySquare } from "lucide-react";

import { cn } from "@/lib/utils";

export function BrandMark({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "gradient-brand flex size-11 items-center justify-center rounded-2xl text-primary-foreground shadow-lg shadow-primary/25",
        className
      )}
    >
      <ActivitySquare className="size-6" />
    </div>
  );
}
