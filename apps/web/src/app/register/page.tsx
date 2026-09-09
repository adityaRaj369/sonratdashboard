"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { registerSchema } from "@sonrat/shared";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { useRegister } from "@/hooks/use-auth";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Field, Input } from "@/components/ui";

type FormValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const registerMutation = useRegister();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<FormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      organizationName: "",
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null);
    try {
      await registerMutation.mutateAsync(values);
      window.location.assign("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    }
  });

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(30,64,110,0.12),_transparent_55%),linear-gradient(180deg,#f7f9fc_0%,#eef3f8_100%)]" />
      <Card className="relative w-full max-w-md">
        <CardHeader>
          <CardTitle className="font-display text-2xl">Create account</CardTitle>
          <CardDescription>
            Start your organization on Sonrat
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-3" onSubmit={onSubmit}>
            <Field label="Your name" htmlFor="name" error={form.formState.errors.name?.message}>
              <Input id="name" {...form.register("name")} />
            </Field>
            <Field
              label="Organization"
              htmlFor="organizationName"
              error={form.formState.errors.organizationName?.message}
            >
              <Input id="organizationName" {...form.register("organizationName")} />
            </Field>
            <Field label="Email" htmlFor="email" error={form.formState.errors.email?.message}>
              <Input id="email" type="email" {...form.register("email")} />
            </Field>
            <Field
              label="Password"
              htmlFor="password"
              error={form.formState.errors.password?.message}
            >
              <Input id="password" type="password" {...form.register("password")} />
            </Field>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <Button className="w-full" type="submit" loading={registerMutation.isPending}>
              Create account
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link className="text-primary underline-offset-2 hover:underline" href="/login">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
