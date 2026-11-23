"use client";

import { useActionState } from "react";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { registerStudent } from "@/lib/student-actions";
import { PasswordInput } from "@/components/password-input";
import { Button } from "@/components/ui/button";

export function RegisterForm() {
  const [state, action, pending] = useActionState(registerStudent, { error: "" });
  return <form action={action} aria-busy={pending} className="login-form">
    <div className="field">
      <label htmlFor="student-name">Full name</label>
      <input id="student-name" className="input" name="name" minLength={2} maxLength={80} required autoComplete="name" aria-describedby="student-name-hint" />
      <small id="student-name-hint">Use fictional details in this demo.</small>
    </div>
    <div className="field">
      <label htmlFor="student-email">Email address</label>
      <input id="student-email" className="input" name="email" type="email" maxLength={254} autoComplete="username" required />
    </div>
    <div className="field">
      <label htmlFor="student-password">Password</label>
      <PasswordInput id="student-password" className="input" name="password" minLength={12} maxLength={72} autoComplete="new-password" required aria-describedby="student-password-hint" />
      <small id="student-password-hint">At least 12 characters.</small>
    </div>
    {state.error && <p className="message error-message" role="alert">{state.error}</p>}
    <Button className="login-button" disabled={pending} type="submit">
      {pending ? <><LoaderCircle className="spin" size={17} /> Creating account</> : <>Create account <ArrowRight size={17} /></>}
    </Button>
  </form>;
}
