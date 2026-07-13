import { AcknowledgeButton } from "@/components/dashboard/acknowledge-button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { createClient } from "@/lib/supabase/server";
import type { Alert, Patient } from "@/lib/supabase/types";

function AlertsTable({
  alerts,
  patientsById,
  emptyLabel,
}: {
  alerts: Alert[];
  patientsById: Map<string, Patient>;
  emptyLabel: string;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>When</TableHead>
          <TableHead>Patient</TableHead>
          <TableHead>Severity</TableHead>
          <TableHead>Message</TableHead>
          <TableHead className="text-right">Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {alerts.map((alert) => (
          <TableRow key={alert.id}>
            <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
              {new Date(alert.created_at).toLocaleString()}
            </TableCell>
            <TableCell className="font-medium">
              {alert.patient_id
                ? patientsById.get(alert.patient_id)?.full_name ?? "Unknown"
                : "Unassigned device"}
            </TableCell>
            <TableCell>
              <Badge variant={alert.severity === "critical" ? "destructive" : "warning"}>
                {alert.severity}
              </Badge>
            </TableCell>
            <TableCell className="max-w-[320px] truncate">{alert.message}</TableCell>
            <TableCell className="text-right">
              {!alert.acknowledged && <AcknowledgeButton alertId={alert.id} />}
            </TableCell>
          </TableRow>
        ))}
        {alerts.length === 0 && (
          <TableRow>
            <TableCell colSpan={5} className="text-center text-muted-foreground">
              {emptyLabel}
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}

export default async function AlertsPage() {
  const supabase = await createClient();

  const [{ data: allAlerts }, { data: patients }] = await Promise.all([
    supabase
      .from("alerts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200),
    supabase.from("patients").select("*"),
  ]);

  const patientsById = new Map((patients ?? []).map((p) => [p.id, p]));
  const unacknowledged = (allAlerts ?? []).filter((a) => !a.acknowledged);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Alerts</h1>
        <p className="text-sm text-muted-foreground">
          Abnormal vitals raised by any monitored patient.
        </p>
      </div>

      <Tabs defaultValue="open">
        <TabsList>
          <TabsTrigger value="open">Open ({unacknowledged.length})</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>
        <TabsContent value="open">
          <div className="rounded-lg border">
            <AlertsTable
              alerts={unacknowledged}
              patientsById={patientsById}
              emptyLabel="No open alerts. Everyone's stable."
            />
          </div>
        </TabsContent>
        <TabsContent value="all">
          <div className="rounded-lg border">
            <AlertsTable
              alerts={allAlerts ?? []}
              patientsById={patientsById}
              emptyLabel="No alerts recorded yet."
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
