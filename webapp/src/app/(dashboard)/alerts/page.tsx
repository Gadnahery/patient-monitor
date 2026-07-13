import { AlertsTable } from "@/components/dashboard/alerts-table";
import { NotificationPermissionButton } from "@/components/dashboard/notification-permission-button";
import { createClient } from "@/lib/supabase/server";

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

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Alerts</h1>
          <p className="text-sm text-muted-foreground">
            Abnormal vitals raised by any monitored patient, live-updated as they happen.
          </p>
        </div>
        <NotificationPermissionButton />
      </div>

      <AlertsTable initialAlerts={allAlerts ?? []} patients={patients ?? []} />
    </div>
  );
}
