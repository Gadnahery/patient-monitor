import type { Thresholds, VitalsReading } from "@/lib/supabase/types";

export type VitalStatus = "normal" | "warning" | "critical" | "no-data";

export function classifyReading(
  reading: VitalsReading | null | undefined,
  thresholds: Thresholds
): VitalStatus {
  if (!reading) return "no-data";
  if (reading.signal_quality === "no_contact") return "no-data";

  const { heart_rate, spo2, temperature } = reading;
  let worst: VitalStatus = "normal";

  const bump = (candidate: VitalStatus) => {
    if (candidate === "critical") worst = "critical";
    else if (candidate === "warning" && worst !== "critical") worst = "warning";
  };

  if (heart_rate != null) {
    if (heart_rate < thresholds.hr_min - 15 || heart_rate > thresholds.hr_max + 20) {
      bump("critical");
    } else if (heart_rate < thresholds.hr_min || heart_rate > thresholds.hr_max) {
      bump("warning");
    }
  }

  if (spo2 != null) {
    if (spo2 < thresholds.spo2_min - 6) bump("critical");
    else if (spo2 < thresholds.spo2_min) bump("warning");
  }

  if (temperature != null) {
    if (
      temperature < thresholds.temp_min - 1.5 ||
      temperature > thresholds.temp_max + 1.5
    ) {
      bump("critical");
    } else if (temperature < thresholds.temp_min || temperature > thresholds.temp_max) {
      bump("warning");
    }
  }

  return worst;
}

// Postgres `numeric` columns round-trip as JS floats, so a value inserted as
// 97.1 can come back as 97.09999999999999 or similar. Round for display so
// vitals cards show a clean, fixed-width number instead of a long decimal
// that can overflow its grid cell.
export function formatVital(value: number | null | undefined, decimals = 1) {
  if (value == null) return "--";
  return value.toFixed(decimals);
}

export function isStale(reading: VitalsReading | null | undefined, staleMs = 60_000) {
  if (!reading) return true;
  return Date.now() - new Date(reading.recorded_at).getTime() > staleMs;
}

export function isDeviceOnline(lastSeenAt: string | null, onlineWindowMs = 15_000) {
  if (!lastSeenAt) return false;
  return Date.now() - new Date(lastSeenAt).getTime() < onlineWindowMs;
}
