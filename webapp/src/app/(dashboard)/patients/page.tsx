import Link from "next/link";

import { dischargePatient, reactivatePatient } from "@/app/actions/patients";
import { AddPatientDialog } from "@/components/dashboard/add-patient-dialog";
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
import { createClient } from "@/lib/supabase/server";

export default async function PatientsPage() {
  const supabase = await createClient();
  const { data: patients } = await supabase
    .from("patients")
    .select("*")
    .order("status")
    .order("full_name");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Patients</h1>
          <p className="text-sm text-muted-foreground">
            Manage admissions, rooms, and per-patient alert thresholds.
          </p>
        </div>
        <AddPatientDialog />
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>MRN</TableHead>
              <TableHead>Room / Bed</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(patients ?? []).map((patient) => (
              <TableRow key={patient.id}>
                <TableCell className="font-medium">
                  <Link href={`/patients/${patient.id}`} className="hover:underline">
                    {patient.full_name}
                  </Link>
                </TableCell>
                <TableCell>{patient.mrn ?? "—"}</TableCell>
                <TableCell>
                  {[patient.room && `Room ${patient.room}`, patient.bed && `Bed ${patient.bed}`]
                    .filter(Boolean)
                    .join(" · ") || "—"}
                </TableCell>
                <TableCell>
                  <Badge variant={patient.status === "active" ? "success" : "secondary"}>
                    {patient.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  {patient.status === "active" ? (
                    <form action={dischargePatient.bind(null, patient.id)}>
                      <Button variant="outline" size="sm" type="submit">
                        Discharge
                      </Button>
                    </form>
                  ) : (
                    <form action={reactivatePatient.bind(null, patient.id)}>
                      <Button variant="outline" size="sm" type="submit">
                        Reactivate
                      </Button>
                    </form>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {(patients ?? []).length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  No patients yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
