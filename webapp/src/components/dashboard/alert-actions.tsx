"use client";

import { useTransition } from "react";
import { Check, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { acknowledgeAlert, deleteAlert, reopenAlert } from "@/app/actions/alerts";
import { Button } from "@/components/ui/button";

export function AlertActions({
  alertId,
  acknowledged,
}: {
  alertId: number;
  acknowledged: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex items-center justify-end gap-1">
      {acknowledged ? (
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          className="gap-1"
          onClick={() =>
            startTransition(async () => {
              await reopenAlert(alertId);
              toast.info("Alert reopened");
            })
          }
        >
          <RotateCcw className="size-3.5" />
          Reopen
        </Button>
      ) : (
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
      )}
      <Button
        size="icon"
        variant="ghost"
        className="size-8 text-destructive hover:text-destructive"
        disabled={pending}
        title="Delete alert"
        onClick={() => {
          if (!window.confirm("Delete this alert permanently?")) return;
          startTransition(async () => {
            await deleteAlert(alertId);
            toast.success("Alert deleted");
          });
        }}
      >
        <Trash2 className="size-3.5" />
      </Button>
    </div>
  );
}
