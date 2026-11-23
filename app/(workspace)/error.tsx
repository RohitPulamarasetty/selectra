"use client";

import { AlertTriangle, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return <main className="error-page"><AlertTriangle size={27} />
    <h1>Something interrupted the workspace</h1>
    <p>The workspace could not load this request. Try again in a moment.</p>
    <Button onClick={reset}><RotateCw size={16} /> Try again</Button>
  </main>;
}
