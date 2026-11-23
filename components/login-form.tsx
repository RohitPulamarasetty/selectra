"use client";

import { startTransition, useActionState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { signInForm } from "@/lib/actions";
import { loginSchema } from "@/lib/validation";
import { PasswordInput } from "@/components/password-input";
import { Button } from "@/components/ui/button";

type Values = { email: string; password: string };

export function LoginForm() {
  const [state, submit, isSubmitting] = useActionState(signInForm, { error: "" });
  const { handleSubmit, register, formState: { errors } } = useForm<Values>({
    resolver: zodResolver(loginSchema), defaultValues: { email: "", password: "" },
  });
  return <form action={submit} noValidate aria-busy={isSubmitting} className="login-form" onSubmit={handleSubmit((values) => {
    if (isSubmitting) return;
    const body = new FormData();
    body.set("email", values.email);
    body.set("password", values.password);
    startTransition(() => submit(body));
  })}>
    <div className="field">
      <label htmlFor="email">Email address</label>
      <input id="email" className="input" type="email" autoComplete="username" required
        aria-invalid={!!errors.email} aria-describedby={errors.email ? "email-error" : undefined} {...register("email")} />
      {errors.email && <small className="field-error" id="email-error">Enter a valid email address.</small>}
    </div>
    <div className="field">
      <label htmlFor="password">Password</label>
      <PasswordInput id="password" className="input" autoComplete="current-password" required
        aria-invalid={!!errors.password} aria-describedby={errors.password ? "password-error" : undefined} {...register("password")} />
      {errors.password && <small className="field-error" id="password-error">Enter a password of at least 8 characters.</small>}
    </div>
    {state.error && <p className="message error-message" role="alert">{state.error}</p>}
    <Button type="submit" disabled={isSubmitting} className="login-button">
      {isSubmitting ? <><LoaderCircle className="spin" size={17} /> Signing in</> : <>Sign in <ArrowRight size={17} /></>}
    </Button>
  </form>;
}
