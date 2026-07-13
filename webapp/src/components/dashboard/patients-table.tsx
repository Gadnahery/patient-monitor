"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";

import { deletePatient, dischargePatient, reactivatePatient } from "@/app/actions/patients";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmSubmitButton } from "@/components/dashboard/confirm-submit-button";
import { EditPatientDialog } from "@/components/dashboard/edit-patient-dialog";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Patient } from "@/lib/supabase/types";
import { ageFromDob, initials } from "@/lib/utils";

export function PatientsTable({ patients }: { patients: Patient[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return patients;
    return patients.filter((p) =>
      [p.full_name, p.mrn, p.room, p.bed, p.diagnosis, p.phone]
        .filter(Boolean)
        .some((field) => field!.toLowerCase().includes(q))
    );
  }, [patients, query]);

  return (
    <div className="flex flex-col gap-3">
      <div className="relative max-w-xs">
        <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search patients..."
          className="pl-8"
        />
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Patient</TableHead>
              <TableHead>MRN</TableHead>
              <TableHead>Room / Bed</TableHead>
              <TableHead>Diagnosis</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((patient) => {
              const age = ageFromDob(patient.date_of_birth);
              return (
                <TableRow key={patient.id}>
                  <TableCell className="font-medium">
                    <Link href={`/patients/${patient.id}`} className="flex items-center gap-2.5 hover:underline">
                      <Avatar className="size-8">
                        <AvatarFallback className="gradient-brand text-primary-foreground text-[11px]">
                          {initials(patient.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="flex flex-col">
                        <span>{patient.full_name}</span>
                        <span className="text-xs font-normal text-muted-foreground">
                          {[age != null && `${age}y`, patient.sex].filter(Boolean).join(" · ") || null}
                        </span>
                      </span>
                    </Link>
                  </TableCell>
                  <TableCell>{patient.mrn ?? "—"}</TableCell>
                  <TableCell>
                    {[patient.room && `Room ${patient.room}`, patient.bed && `Bed ${patient.bed}`]
                      .filter(Boolean)
                      .join(" · ") || "—"}
                  </TableCell>
                  <TableCell className="max-w-[160px] truncate">
                    {patient.diagnosis ?? "—"}
                  </TableCell>
                  <TableCell>{patient.phone ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={patient.status === "active" ? "success" : "secondary"}>
                      {patient.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <EditPatientDialog patient={patient} />
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
                      <form action={deletePatient.bind(null, patient.id)}>
                        <ConfirmSubmitButton
                          variant="ghost"
                          size="sm"
                          type="submit"
                          className="text-destructive hover:text-destructive"
                          confirmMessage={`Permanently delete ${patient.full_name}? This removes their vitals history and alerts too.`}
                        >
                          Delete
                        </ConfirmSubmitButton>
                      </form>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  {patients.length === 0 ? "No patients yet." : "No patients match your search."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
