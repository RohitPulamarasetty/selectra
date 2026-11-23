import Link from "next/link";
import { ArrowUpRight, KeyRound, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { demoRoles, demoCredentials, demoPassword } from "@/lib/demo-preview";
import { redirect } from "next/navigation";
import { AuthFrame } from "@/components/auth-frame";
import { LoginForm } from "@/components/login-form";
import { session } from "@/lib/data";
import { roleHome } from "@/lib/model";

export const metadata = { title: "Sign in" };

export default async function Login() {
  const current = await session();
  if (current) redirect(roleHome(current.profile.role));
  return <AuthFrame mode="login">
    <div className="demo-access">
      <div className="demo-access-title"><span>Try Selectra</span><p>Explore sample applications with a demo role.</p></div>
      <div className="demo-access-roles" aria-label="One-click demo access">
        {demoRoles.map((role) => <Button asChild variant="outline" key={role}>
          <Link href={`/demo/${role}`}>{demoCredentials[role].label} demo <ArrowUpRight size={14} /></Link>
        </Button>)}
      </div>
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
