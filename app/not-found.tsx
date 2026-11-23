import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return <main className="error-page"><h1>Page unavailable</h1><p>Check the address or return to the Selectra home page.</p><Button asChild><Link href="/">Back to home</Link></Button></main>;
}
