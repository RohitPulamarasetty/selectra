import Link from "next/link";
import { KeyRound, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { demoAccounts, demoCredentials, demoPassword } from "@/lib/demo-preview";
import { redirect } from "next/navigation";
import { AuthFrame } from "@/components/auth-frame";
import { DemoRolePicker } from "@/components/demo-role-picker";
import { LoginForm } from "@/components/login-form";
import { resetDemo } from "@/lib/actions";
import { session } from "@/lib/data";
import { roleHome } from "@/lib/model";

export const metadata = { title: "Sign in" };

export default async function Login({ searchParams }: { searchParams: Promise<{ demo?: string }> }) {
  const [current, { demo }] = await Promise.all([session(), searchParams]);
  if (current && !current.demo) redirect(roleHome(current.profile.role));
  if (current && !demo) redirect(roleHome(current.profile.role));
  return <AuthFrame mode="login">
    <div className="demo-access" id="demo-access">
      <div className="demo-access-title"><span>Try Selectra</span><p>Use all three roles in your own editable practice workspace. Changes last up to two hours.</p></div>
      {demo === "unavailable" && <p role="alert">Demo sign-in is temporarily unavailable. Please try again.</p>}
      {demo === "blocked" && <p role="alert">This role is blocked in your demo. Choose another role or start fresh.</p>}
      {demo === "fresh" && <p role="status">Choose a role to start a fresh demo.</p>}
      <DemoRolePicker variant="buttons" />
      <details className="demo-credentials">
        <summary><KeyRound size={15} /> Demo credentials <ChevronDown size={14} /></summary>
        <dl>{demoAccounts.map((role) => <div key={role}>
          <dt>{demoCredentials[role].label}</dt><dd><code>{demoCredentials[role].email}</code></dd>
        </div>)}
          <div><dt>Demo password</dt><dd><code>{demoPassword}</code></dd></div>
        </dl>
      </details>
      {(current?.demo || demo === "blocked" || demo === "switch") && <form action={resetDemo}>
        <Button type="submit" variant="outline" size="sm">Start a fresh demo</Button>
      </form>}
    </div>
    <div className="auth-divider">Sign in with an account</div>
    <LoginForm />
    <p className="auth-alt">New student? <Link href="/register">Create an account</Link></p>
  </AuthFrame>;
}
