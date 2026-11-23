import Link from "next/link";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { CreatorCredit } from "@/components/common";
import { PublicHeader } from "@/components/public-header";
import { MethodologyGuide } from "@/components/methodology-guide";
import { INITIAL_WEIGHTS } from "@/lib/model";

export const metadata = { title: "Public evaluation guide" };

export default function Evaluation() {
  return <div className="public-guide">
    <a className="skip-link" href="#public-guide-content">Skip to content</a>
    <PublicHeader><Link className="site-sign-in" href="/"><ArrowLeft size={15} /> Back to home</Link></PublicHeader>
    <main id="public-guide-content" className="site-width"><MethodologyGuide weights={INITIAL_WEIGHTS} version={1} eligibilityVersion={1} minimum={20} cutoff={0.5} disagreement={30} example />
      <footer><Link href="/apply">Start an application <ArrowUpRight size={15} /></Link><Link href="/login">Staff sign in</Link><CreatorCredit /></footer>
    </main>
  </div>;
}
