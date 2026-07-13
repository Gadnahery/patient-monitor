"use client";

import Link from "next/link";
import { HeartPulse, Thermometer, Droplets, Clock } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { classifyReading, isStale } from "@/lib/vitals";
import { cn } from "@/lib/utils";
import type { Patient, VitalsReading } from "@/lib/supabase/types";

const STATUS_STYLES: Record<string, string> = {
  normal: "border-success/40",
  warning: "border-warning bg-warning/5",
  critical: "border-destructive bg-destructive/5",
  "no-data": "border-border",
};

const STATUS_BADGE: Record<string, "success" | "warning" | "destructive" | "secondary"> = {
  normal: "success",
  warning: "warning",
  critical: "destructive",
  "no-data": "secondary",
};

function timeAgo(iso: string) {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

export function VitalsCard({
  patient,
  reading,
}: {
  patient: Patient;
  reading: VitalsReading | null;
}) {
  const stale = isStale(reading);
  const status = stale ? "no-data" : classifyReading(reading, patient.thresholds);

  return (
    <Link href={`/patients/${patient.id}`}>
      <Card
        className={cn(
          "h-full transition-shadow hover:shadow-md",
          STATUS_STYLES[status]
        )}
      >
        <CardHeader className="flex-row items-start justify-between gap-2 space-y-0">
          <div>
            <CardTitle className="text-base">{patient.full_name}</CardTitle>
            <p className="text-xs text-muted-foreground">
              {[patient.room && `Room ${patient.room}`, patient.bed && `Bed ${patient.bed}`]
                .filter(Boolean)
                .join(" · ") || patient.mrn || "—"}
            </p>
          </div>
          <Badge variant={STATUS_BADGE[status]}>
            {status === "no-data" ? "No signal" : status}
          </Badge>
        </CardHeader>
        <CardContent className="grid grid-cols-3 gap-3">
          <Metric
            icon={<HeartPulse className="size-4 text-chart-4" />}
            label="HR"
            value={reading?.heart_rate ? `${reading.heart_rate}` : "--"}
            unit="bpm"
          />
          <Metric
            icon={<Droplets className="size-4 text-chart-1" />}
            label="SpO2"
            value={reading?.spo2 ? `${reading.spo2}` : "--"}
            unit="%"
          />
          <Metric
            icon={<Thermometer className="size-4 text-chart-3" />}
            label="Temp"
            value={reading?.temperature ? `${reading.temperature}` : "--"}
            unit="°C"
          />
        </CardContent>
        <div className="flex items-center gap-1 px-5 text-xs text-muted-foreground">
          <Clock className="size-3" />
          {reading ? timeAgo(reading.recorded_at) : "No readings yet"}
        </div>
      </Card>
    </Link>
  );
}

function Metric({
  icon,
  label,
  value,
  unit,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  unit: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="text-xl font-semibold tabular-nums">
        {value}
        <span className="ml-1 text-xs font-normal text-muted-foreground">{unit}</span>
      </div>
    </div>
  );
}
