"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, Cpu, BellRing, LogOut } from "lucide-react";

import { logout } from "@/app/actions/auth";
import { BrandMark } from "@/components/dashboard/brand-logo";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn, initials } from "@/lib/utils";

const links = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/patients", label: "Patients", icon: Users },
  { href: "/devices", label: "Devices", icon: Cpu },
  { href: "/alerts", label: "Alerts", icon: BellRing },
];

function useActiveHref() {
  const pathname = usePathname();
  return (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
}

function NavLinks() {
  const isActive = useActiveHref();

  return (
    <nav className="flex flex-col gap-1">
      {links.map(({ href, label, icon: Icon }) => {
        const active = isActive(href);
        return (
          <Link
            key={href}
            href={href}
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

function AccountMenu({ fullName }: { fullName: string }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="rounded-full outline-none ring-primary/40 focus-visible:ring-2">
          <Avatar>
            <AvatarFallback className="gradient-brand text-primary-foreground">
              {initials(fullName)}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel className="truncate">{fullName}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <form action={logout}>
          <DropdownMenuItem asChild variant="destructive">
            <button type="submit" className="w-full">
              <LogOut className="size-4" />
              Sign out
            </button>
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function BottomTabBar({ unacknowledgedCount }: { unacknowledgedCount: number }) {
  const isActive = useActiveHref();

  return (
    <nav className="pb-safe fixed inset-x-0 bottom-0 z-40 px-4 pb-4 md:hidden">
      <div className="mx-auto flex max-w-sm items-center justify-between gap-1 rounded-full border bg-card/90 p-1.5 shadow-xl shadow-black/10 backdrop-blur-lg">
        {links.map(({ href, label, icon: Icon }) => {
          const active = isActive(href);
          const showBadge = href === "/alerts" && unacknowledgedCount > 0;
          return (
            <Link
              key={href}
              href={href}
              className="relative flex flex-1 flex-col items-center gap-0.5 rounded-full py-2 text-[10px] font-medium transition-colors"
            >
              <span
                className={cn(
                  "flex size-9 items-center justify-center rounded-full transition-all",
                  active ? "gradient-brand shadow-md shadow-primary/30" : ""
                )}
              >
                <Icon
                  className={cn(
                    "size-[18px]",
                    active ? "text-primary-foreground" : "text-muted-foreground"
                  )}
                />
              </span>
              <span className={active ? "text-foreground" : "text-muted-foreground"}>
                {label}
              </span>
              {showBadge && (
                <span className="absolute top-0 right-2 flex size-4 items-center justify-center rounded-full bg-destructive text-[9px] font-semibold text-destructive-foreground">
                  {unacknowledgedCount > 9 ? "9+" : unacknowledgedCount}
                </span>
              )}
            </Link>
          );
        })}
      </div>
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
  return (
    <>
      <aside className="hidden w-60 shrink-0 border-r bg-sidebar p-4 md:flex md:flex-col">
        <div className="mb-6 flex items-center gap-2 px-1">
          <BrandMark className="size-9 rounded-xl" />
          <span className="font-semibold">Patient Monitor</span>
        </div>
        <NavLinks />
        <div className="mt-auto flex items-center gap-2 border-t pt-4">
          <Avatar>
            <AvatarFallback className="gradient-brand text-primary-foreground">
              {initials(fullName)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{fullName}</div>
          <form action={logout}>
            <Button variant="ghost" size="icon" type="submit" title="Sign out">
              <LogOut className="size-4" />
            </Button>
          </form>
        </div>
      </aside>

      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur md:hidden">
        <div className="flex items-center gap-2 font-semibold">
          <BrandMark className="size-8 rounded-lg" />
          Patient Monitor
        </div>
        {unacknowledgedCount > 0 && (
          <span className="ml-auto flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-1 text-xs font-medium text-destructive">
            <BellRing className="size-3" />
            {unacknowledgedCount}
          </span>
        )}
        <div className={unacknowledgedCount > 0 ? "" : "ml-auto"}>
          <AccountMenu fullName={fullName} />
        </div>
      </header>

      <BottomTabBar unacknowledgedCount={unacknowledgedCount} />
    </>
  );
}
