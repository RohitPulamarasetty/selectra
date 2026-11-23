import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthFrame } from "@/components/auth-frame";
import { RegisterForm } from "@/components/register-form";
import { session } from "@/lib/data";
import { roleHome } from "@/lib/model";

export const metadata = { title: "Student registration" };

export default async function Register() {
  const current = await session();
  if (current) redirect(roleHome(current.profile.role));
  return <AuthFrame mode="register">
    <RegisterForm />
    <p className="auth-alt">Already have an account? <Link href="/login">Sign in</Link></p>
  </AuthFrame>;
}
