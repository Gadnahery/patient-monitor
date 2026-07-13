"use client";

import { useTransition } from "react";
import { Check } from "lucide-react";
import { toast } from "sonner";

import { acknowledgeAlert } from "@/app/actions/alerts";
import { Button } from "@/components/ui/button";

export function AcknowledgeButton({ alertId }: { alertId: number }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      size="sm"
      variant="outline"
      disabled={pending}
      className="gap-1"
      onClick={() =>
        startTransition(async () => {
          await acknowledgeAlert(alertId);
          toast.success("Alert acknowledged");
        })
      }
    >
      <Check className="size-3.5" />
      Acknowledge
    </Button>
  );
}
