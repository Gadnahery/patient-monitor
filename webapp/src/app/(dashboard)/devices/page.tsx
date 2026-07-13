import { deleteDevice } from "@/app/actions/devices";
import { AddDeviceDialog } from "@/components/dashboard/add-device-dialog";
import { AssignDeviceSelect } from "@/components/dashboard/assign-device-select";
import { CopyButton } from "@/components/dashboard/copy-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { isDeviceOnline } from "@/lib/vitals";
import { createClient } from "@/lib/supabase/server";

export default async function DevicesPage() {
  const supabase = await createClient();

  const [{ data: devices }, { data: patients }] = await Promise.all([
    supabase.from("devices").select("*").order("created_at", { ascending: false }),
    supabase.from("patients").select("*").eq("status", "active").order("full_name"),
  ]);

  const patientsById = new Map((patients ?? []).map((p) => [p.id, p]));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Devices</h1>
          <p className="text-sm text-muted-foreground">
            Register ESP32 monitors and assign each to a patient.
          </p>
        </div>
        <AddDeviceDialog patients={patients ?? []} />
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Device key</TableHead>
              <TableHead>Patient</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(devices ?? []).map((device) => {
              const online = isDeviceOnline(device.last_seen_at);
              return (
                <TableRow key={device.id}>
                  <TableCell className="font-medium">{device.name}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                        {device.device_key.slice(0, 10)}...
                      </code>
                      <CopyButton value={device.device_key} />
                    </div>
                  </TableCell>
                  <TableCell>
                    <AssignDeviceSelect
                      deviceId={device.id}
                      patients={patients ?? []}
                      currentPatientId={
                        device.patient_id && patientsById.has(device.patient_id)
                          ? device.patient_id
                          : null
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Badge variant={online ? "success" : "secondary"}>
                      {online ? "Online" : "Offline"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <form action={deleteDevice.bind(null, device.id)}>
                      <Button variant="ghost" size="sm" type="submit">
                        Remove
                      </Button>
                    </form>
                  </TableCell>
                </TableRow>
              );
            })}
            {(devices ?? []).length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  No devices registered yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
