import { AlertTriangle, Cpu, HeartPulse, Users } from "lucide-react";

import { PatientVitalsGrid } from "@/components/dashboard/patient-vitals-grid";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import type { VitalsReading } from "@/lib/supabase/types";

export default async function DashboardPage() {
  const supabase = await createClient();

  const [{ data: patients }, { data: readings }, { count: criticalCount }, { count: deviceCount }] =
    await Promise.all([
      supabase
        .from("patients")
        .select("*")
        .eq("status", "active")
        .order("full_name"),
      supabase.from("latest_vitals").select("*"),
      supabase
        .from("alerts")
        .select("*", { count: "exact", head: true })
        .eq("acknowledged", false)
        .eq("severity", "critical"),
      supabase.from("devices").select("*", { count: "exact", head: true }),
    ]);

  const readingsByPatient: Record<string, VitalsReading> = {};
  for (const reading of readings ?? []) {
    if (reading.patient_id) readingsByPatient[reading.patient_id] = reading;
  }

  const stats = [
    {
      label: "Active patients",
      value: patients?.length ?? 0,
      icon: Users,
    },
    {
      label: "Critical alerts",
      value: criticalCount ?? 0,
      icon: AlertTriangle,
      accent: (criticalCount ?? 0) > 0 ? "text-destructive" : undefined,
    },
    {
      label: "Monitors registered",
      value: deviceCount ?? 0,
      icon: Cpu,
    },
    {
      label: "Live readings (24h)",
      value: readings?.length ?? 0,
      icon: HeartPulse,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Ward overview</h1>
        <p className="text-sm text-muted-foreground">
          Live vitals for every active patient, updated in real time.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map(({ label, value, icon: Icon, accent }) => (
          <Card key={label}>
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-0">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                {label}
              </CardTitle>
              <Icon className={`size-4 text-muted-foreground ${accent ?? ""}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold tabular-nums ${accent ?? ""}`}>{value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <PatientVitalsGrid patients={patients ?? []} initialReadings={readingsByPatient} />
    </div>
  );
}
