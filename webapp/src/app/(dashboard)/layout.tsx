import { redirect } from "next/navigation";

import { AlertsListener } from "@/components/dashboard/alerts-listener";
import { DashboardNav } from "@/components/dashboard/nav";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();

  const { count } = await supabase
    .from("alerts")
    .select("*", { count: "exact", head: true })
    .eq("acknowledged", false);

  return (
    <div className="flex min-h-svh flex-col md:flex-row">
      <DashboardNav
        fullName={profile?.full_name ?? user.email ?? "Clinician"}
        unacknowledgedCount={count ?? 0}
      />
      <main className="flex-1 overflow-x-hidden p-4 md:p-6">{children}</main>
      <AlertsListener />
    </div>
  );
}
