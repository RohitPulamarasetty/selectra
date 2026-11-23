import "./workspace.css";
import { Shell } from "@/components/shell";
import { cycleContext, requireSession } from "@/lib/data";

export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const [{ profile, demo }, { cycle }] = await Promise.all([requireSession(), cycleContext()]);
  return <Shell profile={profile} cycle={cycle} demo={demo}>{children}</Shell>;
}
