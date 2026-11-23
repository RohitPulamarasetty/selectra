"use client";

import { AlertTriangle, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return <section className="error-page" aria-labelledby="workspace-error"><AlertTriangle size={27} />
    <h1 id="workspace-error">Something interrupted the workspace</h1>
    <p>The workspace could not load this request. Try again in a moment.</p>
    <Button onClick={reset}><RotateCw size={16} /> Try again</Button>
  </section>;
}
