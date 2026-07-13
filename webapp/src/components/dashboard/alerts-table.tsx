"use client";

import { useEffect, useMemo, useState } from "react";

import { AlertActions } from "@/components/dashboard/alert-actions";
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
import { createClient } from "@/lib/supabase/client";
import type { Alert, Patient } from "@/lib/supabase/types";

function AlertsRows({
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
          <TableHead className="text-right">Actions</TableHead>
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
              <AlertActions alertId={alert.id} acknowledged={alert.acknowledged} />
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

export function AlertsTable({
  initialAlerts,
  patients,
}: {
  initialAlerts: Alert[];
  patients: Patient[];
}) {
  const [alerts, setAlerts] = useState(initialAlerts);
  const patientsById = useMemo(() => new Map(patients.map((p) => [p.id, p])), [patients]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("alerts-table")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "alerts" },
        (payload) => {
          const alert = payload.new as Alert;
          setAlerts((prev) => [alert, ...prev]);
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "alerts" },
        (payload) => {
          const alert = payload.new as Alert;
          setAlerts((prev) => prev.map((a) => (a.id === alert.id ? alert : a)));
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "alerts" },
        (payload) => {
          const old = payload.old as { id: number };
          setAlerts((prev) => prev.filter((a) => a.id !== old.id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const unacknowledged = alerts.filter((a) => !a.acknowledged);

  return (
    <Tabs defaultValue="open">
      <TabsList>
        <TabsTrigger value="open">Open ({unacknowledged.length})</TabsTrigger>
        <TabsTrigger value="all">All ({alerts.length})</TabsTrigger>
      </TabsList>
      <TabsContent value="open">
        <div className="rounded-lg border">
          <AlertsRows
            alerts={unacknowledged}
            patientsById={patientsById}
            emptyLabel="No open alerts. Everyone's stable."
          />
        </div>
      </TabsContent>
      <TabsContent value="all">
        <div className="rounded-lg border">
          <AlertsRows
            alerts={alerts}
            patientsById={patientsById}
            emptyLabel="No alerts recorded yet."
          />
        </div>
      </TabsContent>
    </Tabs>
  );
}
