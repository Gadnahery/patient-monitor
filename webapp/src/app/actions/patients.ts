"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import type { Thresholds } from "@/lib/supabase/types";

export type ActionState = { error: string } | { success: true } | undefined;

const DEFAULT_THRESHOLDS: Thresholds = {
  hr_min: 50,
  hr_max: 120,
  spo2_min: 92,
  temp_min: 35.5,
  temp_max: 38.5,
};

export async function createPatient(
  _state: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = await createClient();

  const full_name = String(formData.get("full_name") ?? "").trim();
  if (!full_name) return { error: "Full name is required" };

  const mrn = String(formData.get("mrn") ?? "").trim() || null;
  const room = String(formData.get("room") ?? "").trim() || null;
  const bed = String(formData.get("bed") ?? "").trim() || null;
  const date_of_birth = String(formData.get("date_of_birth") ?? "").trim() || null;
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const sex = (String(formData.get("sex") ?? "").trim() || null) as
    | "male"
    | "female"
    | "other"
    | null;
  const diagnosis = String(formData.get("diagnosis") ?? "").trim() || null;

  const { error } = await supabase.from("patients").insert({
    full_name,
    mrn,
    room,
    bed,
    date_of_birth,
    phone,
    sex,
    diagnosis,
    thresholds: DEFAULT_THRESHOLDS,
  });

  if (error) return { error: error.message };

  revalidatePath("/patients");
  return { success: true };
}

export async function updatePatient(
  _state: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = await createClient();

  const patientId = String(formData.get("patient_id") ?? "");
  if (!patientId) return { error: "Missing patient" };

  const full_name = String(formData.get("full_name") ?? "").trim();
  if (!full_name) return { error: "Full name is required" };

  const mrn = String(formData.get("mrn") ?? "").trim() || null;
  const room = String(formData.get("room") ?? "").trim() || null;
  const bed = String(formData.get("bed") ?? "").trim() || null;
  const date_of_birth = String(formData.get("date_of_birth") ?? "").trim() || null;
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const sex = (String(formData.get("sex") ?? "").trim() || null) as
    | "male"
    | "female"
    | "other"
    | null;
  const diagnosis = String(formData.get("diagnosis") ?? "").trim() || null;

  const { error } = await supabase
    .from("patients")
    .update({ full_name, mrn, room, bed, date_of_birth, phone, sex, diagnosis })
    .eq("id", patientId);

  if (error) return { error: error.message };

  revalidatePath("/patients");
  revalidatePath(`/patients/${patientId}`);
  return { success: true };
}

export async function dischargePatient(patientId: string) {
  const supabase = await createClient();
  await supabase.from("patients").update({ status: "discharged" }).eq("id", patientId);
  revalidatePath("/patients");
  revalidatePath(`/patients/${patientId}`);
}

export async function reactivatePatient(patientId: string) {
  const supabase = await createClient();
  await supabase.from("patients").update({ status: "active" }).eq("id", patientId);
  revalidatePath("/patients");
  revalidatePath(`/patients/${patientId}`);
}

export async function deletePatient(patientId: string) {
  const supabase = await createClient();
  await supabase.from("patients").delete().eq("id", patientId);
  revalidatePath("/patients");
}

export async function updateThresholds(
  _state: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = await createClient();
  const patientId = String(formData.get("patient_id") ?? "");
  if (!patientId) return { error: "Missing patient" };

  const thresholds: Thresholds = {
    hr_min: Number(formData.get("hr_min")),
    hr_max: Number(formData.get("hr_max")),
    spo2_min: Number(formData.get("spo2_min")),
    temp_min: Number(formData.get("temp_min")),
    temp_max: Number(formData.get("temp_max")),
  };

  for (const value of Object.values(thresholds)) {
    if (Number.isNaN(value)) return { error: "All thresholds must be numbers" };
  }

  const { error } = await supabase
    .from("patients")
    .update({ thresholds })
    .eq("id", patientId);

  if (error) return { error: error.message };

  revalidatePath(`/patients/${patientId}`);
  return { success: true };
}
