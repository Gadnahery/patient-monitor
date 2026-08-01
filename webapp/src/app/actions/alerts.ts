"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export async function acknowledgeAlert(alertId: number) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  await supabase
    .from("alerts")
    .update({
      acknowledged: true,
      acknowledged_by: user?.id ?? null,
      acknowledged_at: new Date().toISOString(),
    })
    .eq("id", alertId);

  revalidatePath("/alerts");
  revalidatePath("/");
}

export async function reopenAlert(alertId: number) {
  const supabase = await createClient();

  await supabase
    .from("alerts")
    .update({ acknowledged: false, acknowledged_by: null, acknowledged_at: null })
    .eq("id", alertId);

  revalidatePath("/alerts");
  revalidatePath("/");
}

export async function deleteAlert(alertId: number) {
  const supabase = await createClient();

  await supabase.from("alerts").delete().eq("id", alertId);

  revalidatePath("/alerts");
  revalidatePath("/");
}

export async function deleteAllAlerts() {
  const supabase = await createClient();

  // .neq on a column that's never -1 is a simple "match every row" filter -
  // Supabase requires some filter on delete, it won't take an empty one.
  await supabase.from("alerts").delete().neq("id", -1);

  revalidatePath("/alerts");
  revalidatePath("/");
}

export async function deleteAcknowledgedAlerts() {
  const supabase = await createClient();

  await supabase.from("alerts").delete().eq("acknowledged", true);

  revalidatePath("/alerts");
  revalidatePath("/");
}
