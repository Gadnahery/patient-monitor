"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/app/actions/patients";

export async function createDevice(
  _state: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = await createClient();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Device name is required" };

  const patientId = String(formData.get("patient_id") ?? "") || null;

  const { error } = await supabase.from("devices").insert({
    name,
    patient_id: patientId,
  });

  if (error) return { error: error.message };

  revalidatePath("/devices");
  return { success: true };
}

export async function assignDevice(deviceId: string, patientId: string | null) {
  const supabase = await createClient();
  await supabase.from("devices").update({ patient_id: patientId }).eq("id", deviceId);
  revalidatePath("/devices");
}

export async function deleteDevice(deviceId: string) {
  const supabase = await createClient();
  await supabase.from("devices").delete().eq("id", deviceId);
  revalidatePath("/devices");
}
