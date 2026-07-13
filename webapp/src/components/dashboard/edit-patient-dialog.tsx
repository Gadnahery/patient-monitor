"use client";

import { useState, useTransition } from "react";
import { Pencil } from "lucide-react";
import { toast } from "sonner";

import { updatePatient } from "@/app/actions/patients";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Patient } from "@/lib/supabase/types";

export function EditPatientDialog({ patient }: { patient: Patient }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await updatePatient(undefined, formData);
      if (result && "error" in result) {
        setError(result.error);
        return;
      }
      setError(null);
      toast.success("Patient updated");
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8" title="Edit patient">
          <Pencil className="size-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit patient</DialogTitle>
          <DialogDescription>Update admission and contact details.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input type="hidden" name="patient_id" value={patient.id} />
          <div className="flex flex-col gap-2">
            <Label htmlFor="edit_full_name">Full name</Label>
            <Input id="edit_full_name" name="full_name" defaultValue={patient.full_name} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="edit_mrn">MRN</Label>
              <Input id="edit_mrn" name="mrn" defaultValue={patient.mrn ?? ""} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="edit_date_of_birth">Date of birth</Label>
              <Input
                id="edit_date_of_birth"
                name="date_of_birth"
                type="date"
                defaultValue={patient.date_of_birth ?? ""}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="edit_sex">Sex</Label>
              <Select name="sex" defaultValue={patient.sex ?? undefined}>
                <SelectTrigger id="edit_sex" className="w-full">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="edit_phone">Phone</Label>
              <Input id="edit_phone" name="phone" type="tel" defaultValue={patient.phone ?? ""} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="edit_room">Room</Label>
              <Input id="edit_room" name="room" defaultValue={patient.room ?? ""} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="edit_bed">Bed</Label>
              <Input id="edit_bed" name="bed" defaultValue={patient.bed ?? ""} />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="edit_diagnosis">Diagnosis / condition</Label>
            <Input id="edit_diagnosis" name="diagnosis" defaultValue={patient.diagnosis ?? ""} />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
