import "./workspace.css";
import { Shell } from "@/components/shell";
import { cycleContext, requireSession } from "@/lib/data";

export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const [{ profile }, { cycle }] = await Promise.all([requireSession(), cycleContext()]);
  return <Shell profile={profile} cycle={cycle}>{children}</Shell>;
}
