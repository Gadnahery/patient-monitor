"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";

import { updateThresholds } from "@/app/actions/patients";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Thresholds } from "@/lib/supabase/types";

export function ThresholdsForm({
  patientId,
  thresholds,
}: {
  patientId: string;
  thresholds: Thresholds;
}) {
  const [state, formAction, pending] = useActionState(updateThresholds, undefined);

  useEffect(() => {
    if (state && "success" in state) toast.success("Thresholds updated");
  }, [state]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="patient_id" value={patientId} />
      <div className="grid grid-cols-2 gap-4">
        <Field label="Heart rate min (bpm)" name="hr_min" defaultValue={thresholds.hr_min} />
        <Field label="Heart rate max (bpm)" name="hr_max" defaultValue={thresholds.hr_max} />
        <Field label="SpO2 min (%)" name="spo2_min" defaultValue={thresholds.spo2_min} />
        <Field label="Temp min (°C)" name="temp_min" step="0.1" defaultValue={thresholds.temp_min} />
        <Field label="Temp max (°C)" name="temp_max" step="0.1" defaultValue={thresholds.temp_max} />
      </div>
      {state && "error" in state && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" disabled={pending} className="w-fit">
        {pending ? "Saving..." : "Save thresholds"}
      </Button>
    </form>
  );
}

function Field({
  label,
  name,
  defaultValue,
  step,
}: {
  label: string;
  name: string;
  defaultValue: number;
  step?: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type="number" step={step ?? "1"} defaultValue={defaultValue} />
    </div>
  );
}
