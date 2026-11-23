import { notFound, redirect } from "next/navigation";
import { isDemoRole } from "@/lib/demo-preview";

export default async function LegacyDemo({ params }: { params: Promise<{ role: string }> }) {
  const { role } = await params;
  if (!isDemoRole(role)) notFound();
  redirect("/login#demo-access");
}
