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
