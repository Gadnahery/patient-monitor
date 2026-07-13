"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ActivitySquare,
  LayoutDashboard,
  Users,
  Cpu,
  BellRing,
  Menu,
  LogOut,
} from "lucide-react";
import { useState } from "react";

import { logout } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const links = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/patients", label: "Patients", icon: Users },
  { href: "/devices", label: "Devices", icon: Cpu },
  { href: "/alerts", label: "Alerts", icon: BellRing },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1">
      {links.map(({ href, label, icon: Icon }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            )}
          >
            <Icon className="size-4" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export function DashboardNav({
  fullName,
  unacknowledgedCount,
}: {
  fullName: string;
  unacknowledgedCount: number;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <aside className="hidden w-60 shrink-0 border-r bg-sidebar p-4 md:flex md:flex-col">
        <div className="mb-6 flex items-center gap-2 px-1">
          <ActivitySquare className="size-6 text-primary" />
          <span className="font-semibold">Patient Monitor</span>
        </div>
        <NavLinks />
        <div className="mt-auto flex flex-col gap-2 pt-4">
          <div className="truncate px-1 text-xs text-muted-foreground">{fullName}</div>
          <form action={logout}>
            <Button variant="ghost" size="sm" type="submit" className="w-full justify-start gap-2">
              <LogOut className="size-4" />
              Sign out
            </Button>
          </form>
        </div>
      </aside>

      <header className="flex h-14 items-center gap-3 border-b bg-background px-4 md:hidden">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 bg-sidebar p-4">
            <SheetHeader className="p-0">
              <SheetTitle className="flex items-center gap-2">
                <ActivitySquare className="size-5 text-primary" />
                Patient Monitor
              </SheetTitle>
            </SheetHeader>
            <div className="mt-4">
              <NavLinks onNavigate={() => setOpen(false)} />
            </div>
            <div className="mt-auto flex flex-col gap-2 pt-4">
              <div className="truncate px-1 text-xs text-muted-foreground">{fullName}</div>
              <form action={logout}>
                <Button
                  variant="ghost"
                  size="sm"
                  type="submit"
                  className="w-full justify-start gap-2"
                >
                  <LogOut className="size-4" />
                  Sign out
                </Button>
              </form>
            </div>
          </SheetContent>
        </Sheet>
        <div className="flex items-center gap-2 font-semibold">
          <ActivitySquare className="size-5 text-primary" />
          Patient Monitor
        </div>
        {unacknowledgedCount > 0 && (
          <span className="ml-auto flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-1 text-xs font-medium text-destructive">
            <BellRing className="size-3" />
            {unacknowledgedCount}
          </span>
        )}
      </header>
    </>
  );
}
