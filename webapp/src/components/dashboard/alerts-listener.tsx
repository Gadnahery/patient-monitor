"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import type { Alert } from "@/lib/supabase/types";

// Subscribes to newly-inserted alerts in real time and surfaces a toast for
// clinical staff, regardless of which page in the dashboard they're on.
export function AlertsListener() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());

  useEffect(() => {
    const channel = supabase
      .channel("alerts-listener")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "alerts" },
        async (payload) => {
          const alert = payload.new as Alert;

          let patientName = "Unassigned device";
          if (alert.patient_id) {
            const { data } = await supabase
              .from("patients")
              .select("full_name")
              .eq("id", alert.patient_id)
              .single();
            patientName = data?.full_name ?? patientName;
          }

          toast[alert.severity === "critical" ? "error" : "warning"](
            `${alert.severity === "critical" ? "Critical" : "Warning"}: ${patientName}`,
            { description: alert.message }
          );

          router.refresh();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, router]);

  return null;
}
