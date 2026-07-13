"use client";

import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { isDeviceOnline } from "@/lib/vitals";

// Live device connectivity badge: subscribes to last_seen_at updates from the
// ESP32's periodic Supabase writes and re-checks the online window on a
// short tick so a device that goes quiet flips to "Offline" without a reload.
export function DeviceStatusBadge({
  deviceId,
  initialLastSeenAt,
}: {
  deviceId: string;
  initialLastSeenAt: string | null;
}) {
  const [lastSeenAt, setLastSeenAt] = useState(initialLastSeenAt);
  const [online, setOnline] = useState(() => isDeviceOnline(initialLastSeenAt));

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`device-status-${deviceId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "devices", filter: `id=eq.${deviceId}` },
        (payload) => {
          setLastSeenAt((payload.new as { last_seen_at: string | null }).last_seen_at);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [deviceId]);

  useEffect(() => {
    const tick = () => setOnline(isDeviceOnline(lastSeenAt));
    tick();
    const interval = setInterval(tick, 2000);
    return () => clearInterval(interval);
  }, [lastSeenAt]);

  return (
    <Badge variant={online ? "success" : "secondary"} className="gap-1.5">
      <span
        className={cn(
          "size-1.5 rounded-full",
          online ? "bg-success-foreground animate-pulse" : "bg-muted-foreground"
        )}
      />
      {online ? "Online" : "Offline"}
    </Badge>
  );
}
