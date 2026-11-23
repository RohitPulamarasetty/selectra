import Link from "next/link";
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
    <LoginForm />
    <p className="auth-alt">New student? <Link href="/register">Create an account</Link></p>
  </AuthFrame>;
}
