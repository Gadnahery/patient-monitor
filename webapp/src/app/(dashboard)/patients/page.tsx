import { AddPatientDialog } from "@/components/dashboard/add-patient-dialog";
import { PatientsTable } from "@/components/dashboard/patients-table";
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

      <PatientsTable patients={patients ?? []} />
    </div>
  );
}
