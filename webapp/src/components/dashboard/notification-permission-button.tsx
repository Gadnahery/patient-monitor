"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, BellRing } from "lucide-react";

import { Button } from "@/components/ui/button";

export function NotificationPermissionButton() {
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(
    "default"
  );

  useEffect(() => {
    setPermission("Notification" in window ? Notification.permission : "unsupported");
  }, []);

  if (permission === "unsupported" || permission === "granted") {
    return (
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <BellRing className="size-3.5" />
        {permission === "granted" ? "Alerts notifications on" : "Notifications unsupported"}
      </span>
    );
  }

  if (permission === "denied") {
    return (
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <BellOff className="size-3.5" />
        Notifications blocked in browser settings
      </span>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className="gap-1.5"
      onClick={async () => {
        const result = await Notification.requestPermission();
        setPermission(result);
      }}
    >
      <Bell className="size-3.5" />
      Enable critical alert notifications
    </Button>
  );
}
