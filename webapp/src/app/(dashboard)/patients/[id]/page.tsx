import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ThresholdsForm } from "@/components/dashboard/thresholds-form";
import { VitalsChart } from "@/components/dashboard/vitals-chart";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { classifyReading } from "@/lib/vitals";
import { createClient } from "@/lib/supabase/server";

export default async function PatientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: patient }, { data: readings }, { data: alerts }, { data: device }] =
    await Promise.all([
      supabase.from("patients").select("*").eq("id", id).single(),
      supabase
        .from("vitals_readings")
        .select("*")
        .eq("patient_id", id)
        .order("recorded_at", { ascending: false })
        .limit(120),
      supabase
        .from("alerts")
        .select("*")
        .eq("patient_id", id)
        .order("created_at", { ascending: false })
        .limit(25),
      supabase.from("devices").select("*").eq("patient_id", id).maybeSingle(),
    ]);

  if (!patient) notFound();

  const chronological = [...(readings ?? [])].reverse();
  const latest = readings?.[0] ?? null;
  const status = classifyReading(latest, patient.thresholds);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">{patient.full_name}</h1>
          <p className="text-sm text-muted-foreground">
            {[
              patient.mrn && `MRN ${patient.mrn}`,
              patient.room && `Room ${patient.room}`,
              patient.bed && `Bed ${patient.bed}`,
              device && `Monitor: ${device.name}`,
            ]
              .filter(Boolean)
              .join(" · ") || "No details on file"}
          </p>
        </div>
        <Badge
          variant={
            status === "critical" ? "destructive" : status === "warning" ? "warning" : status === "normal" ? "success" : "secondary"
          }
        >
          {status === "no-data" ? "No signal" : status}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Vitals trend</CardTitle>
        </CardHeader>
        <CardContent>
          <VitalsChart patientId={patient.id} initialReadings={chronological} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Alert thresholds</CardTitle>
          </CardHeader>
          <CardContent>
            <ThresholdsForm patientId={patient.id} thresholds={patient.thresholds} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(alerts ?? []).map((alert) => (
                  <TableRow key={alert.id}>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(alert.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant={alert.severity === "critical" ? "destructive" : "warning"}>
                        {alert.type.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[220px] truncate">{alert.message}</TableCell>
                    <TableCell>
                      {alert.acknowledged ? (
                        <span className="text-xs text-muted-foreground">Acknowledged</span>
                      ) : (
                        <span className="text-xs font-medium text-destructive">Open</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {(alerts ?? []).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      No alerts recorded.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
