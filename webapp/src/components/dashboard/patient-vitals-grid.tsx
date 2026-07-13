"use client";

import { useEffect, useState } from "react";

import { VitalsCard } from "@/components/dashboard/vitals-card";
import { createClient } from "@/lib/supabase/client";
import type { Patient, VitalsReading } from "@/lib/supabase/types";

export function PatientVitalsGrid({
  patients,
  initialReadings,
}: {
  patients: Patient[];
  initialReadings: Record<string, VitalsReading>;
}) {
  const [readings, setReadings] = useState(initialReadings);
  const [supabase] = useState(() => createClient());

  useEffect(() => {
    const channel = supabase
      .channel("vitals-grid")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "vitals_readings" },
        (payload) => {
          const reading = payload.new as VitalsReading;
          if (!reading.patient_id) return;
          setReadings((prev) => {
            const existing = prev[reading.patient_id!];
            if (existing && new Date(existing.recorded_at) > new Date(reading.recorded_at)) {
              return prev;
            }
            return { ...prev, [reading.patient_id!]: reading };
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  if (patients.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No active patients yet. Add one from the Patients page.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {patients.map((patient) => (
        <VitalsCard key={patient.id} patient={patient} reading={readings[patient.id] ?? null} />
      ))}
    </div>
  );
}
