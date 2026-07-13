"use client";

import Link from "next/link";
import { useActionState } from "react";

import { login } from "@/app/actions/auth";
import { BrandMark } from "@/components/dashboard/brand-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(login, undefined);

  return (
    <div className="relative flex min-h-svh items-center justify-center overflow-hidden p-4">
      <div className="gradient-brand absolute inset-0 opacity-95" />
      <div className="absolute -top-32 -left-24 size-80 rounded-full bg-white/10 blur-3xl" />
      <div className="absolute -right-24 -bottom-32 size-96 rounded-full bg-black/10 blur-3xl" />

      <div className="relative w-full max-w-sm rounded-3xl bg-card p-8 shadow-2xl">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <BrandMark />
          <div>
            <h1 className="text-xl font-semibold">Patient Monitor</h1>
            <p className="text-sm text-muted-foreground">Sign in to your ward dashboard</p>
          </div>
        </div>

        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required autoComplete="email" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
            />
          </div>
          {state?.error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {state.error}
            </p>
          )}
          <Button
            type="submit"
            disabled={pending}
            className="gradient-brand mt-2 text-primary-foreground shadow-md hover:opacity-90"
          >
            {pending ? "Signing in..." : "Sign in"}
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          No account?{" "}
          <Link href="/signup" className="font-medium text-primary underline-offset-4 hover:underline">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
