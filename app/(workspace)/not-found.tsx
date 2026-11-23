import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function WorkspaceNotFound() {
  return <section className="error-page" aria-labelledby="workspace-unavailable">
    <h1 id="workspace-unavailable">Page unavailable</h1>
    <p>Check the address or return to your workspace.</p>
    <Button asChild><Link href="/dashboard">Back to overview</Link></Button>
  </section>;
}
