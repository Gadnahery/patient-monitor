"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { assignDevice } from "@/app/actions/devices";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Patient } from "@/lib/supabase/types";

const UNASSIGNED = "unassigned";

export function AssignDeviceSelect({
  deviceId,
  patients,
  currentPatientId,
}: {
  deviceId: string;
  patients: Patient[];
  currentPatientId: string | null;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Select
      value={currentPatientId ?? UNASSIGNED}
      disabled={pending}
      onValueChange={(value) => {
        startTransition(async () => {
          await assignDevice(deviceId, value === UNASSIGNED ? null : value);
          toast.success("Device assignment updated");
        });
      }}
    >
      <SelectTrigger size="sm" className="w-44">
        <SelectValue placeholder="Unassigned" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
        {patients.map((p) => (
          <SelectItem key={p.id} value={p.id}>
            {p.full_name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
