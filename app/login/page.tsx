import Link from "next/link";
import { ArrowUpRight, KeyRound, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { demoRoles, demoCredentials, demoPassword } from "@/lib/demo-preview";
import { redirect } from "next/navigation";
import { AuthFrame } from "@/components/auth-frame";
import { LoginForm } from "@/components/login-form";
import { openDemo } from "@/lib/actions";
import { session } from "@/lib/data";
import { roleHome } from "@/lib/model";

export const metadata = { title: "Sign in" };

export default async function Login({ searchParams }: { searchParams: Promise<{ demo?: string }> }) {
  const current = await session();
  if (current) redirect(roleHome(current.profile.role));
  const { demo } = await searchParams;
  return <AuthFrame mode="login">
    <div className="demo-access" id="demo-access">
      <div className="demo-access-title"><span>Try Selectra</span><p>Open a real dashboard with fictional applications.</p></div>
      {demo === "unavailable" && <p role="alert">Demo sign-in is temporarily unavailable. Please try again.</p>}
      <form className="demo-access-roles" aria-label="One-click demo access" action={openDemo}>
        {demoRoles.map((role) => <Button type="submit" name="role" value={role} variant="outline" key={role}>
          {demoCredentials[role].label} demo <ArrowUpRight size={14} />
        </Button>)}
      </form>
      <details className="demo-credentials">
        <summary><KeyRound size={15} /> Demo credentials <ChevronDown size={14} /></summary>
        <dl>{demoRoles.map((role) => <div key={role}>
          <dt>{demoCredentials[role].label}</dt><dd><code>{demoCredentials[role].email}</code></dd>
        </div>)}
          <div><dt>Demo password</dt><dd><code>{demoPassword}</code></dd></div>
        </dl>
      </details>
    </div>
    <div className="auth-divider">Sign in with an account</div>
    <LoginForm />
    <p className="auth-alt">New student? <Link href="/register">Create an account</Link></p>
  </AuthFrame>;
}
