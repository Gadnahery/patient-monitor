"use client";

import { useEffect, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { createClient } from "@/lib/supabase/client";
import type { VitalsReading } from "@/lib/supabase/types";

const MAX_POINTS = 120;

export function VitalsChart({
  patientId,
  initialReadings,
}: {
  patientId: string;
  initialReadings: VitalsReading[];
}) {
  const [readings, setReadings] = useState(initialReadings);
  const [supabase] = useState(() => createClient());

  useEffect(() => {
    const channel = supabase
      .channel(`vitals-chart-${patientId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "vitals_readings",
          filter: `patient_id=eq.${patientId}`,
        },
        (payload) => {
          const reading = payload.new as VitalsReading;
          setReadings((prev) => [...prev.slice(-(MAX_POINTS - 1)), reading]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, patientId]);

  const data = readings.map((r) => ({
    time: new Date(r.recorded_at).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }),
    heart_rate: r.heart_rate,
    spo2: r.spo2,
    temperature: r.temperature,
  }));

  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        No readings yet for this patient.
      </div>
    );
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis dataKey="time" tick={{ fontSize: 11 }} minTickGap={30} />
          <YAxis yAxisId="left" tick={{ fontSize: 11 }} width={40} />
          <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} width={40} />
          <Tooltip
            contentStyle={{
              background: "var(--popover)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              fontSize: 12,
            }}
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="heart_rate"
            name="Heart rate (bpm)"
            stroke="var(--chart-4)"
            dot={false}
            connectNulls
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="spo2"
            name="SpO2 (%)"
            stroke="var(--chart-1)"
            dot={false}
            connectNulls
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="temperature"
            name="Temp (°C)"
            stroke="var(--chart-3)"
            dot={false}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
