import { ArrowUpRight, CircleHelp, FileText, FlaskConical, Inbox } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { initials, ELIGIBILITY, type Eligibility } from "@/lib/model";
import { cn } from "./ui/button";

export function Brand({ boxed = false }: { boxed?: boolean }) {
  return <span className={cn("brand", boxed && "brand-boxed")}>
    <span className="brand-mark" aria-hidden="true"><FileText size={17} strokeWidth={1.7} /></span>
    <span>Selectra</span>
  </span>;
}

export function PageIntro({ eyebrow, title, description, children }: { eyebrow?: string; title: string; description: string; children?: ReactNode }) {
  return <div className="page-intro"><div>
    {eyebrow && <div className="eyebrow">{eyebrow}</div>}
    <h1>{title}</h1><p>{description}</p>
  </div>{children && <div className="page-actions">{children}</div>}</div>;
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn("card", className)}>{children}</section>;
}

export function CardHeading({ title, description, children }: { title: string; description?: string; children?: ReactNode }) {
  return <div className="card-heading"><div><h2>{title}</h2>{description && <p>{description}</p>}</div>{children}</div>;
}

export function TextLink({ href, children }: { href: string; children: ReactNode }) {
  return <Link className="text-link" href={href}>{children}<ArrowUpRight size={14} aria-hidden="true" /></Link>;
}

export function Avatar({ name, variant = 0, size = "normal" }: { name: string; variant?: number; size?: "normal" | "small" }) {
  return <span aria-hidden="true" className={cn("avatar", `avatar-${variant % 5}`, size === "small" && "avatar-small")}>{initials(name)}</span>;
}

export function Pill({ children, tone = "gray", dot = false }: { children: ReactNode; tone?: string; dot?: boolean }) {
  return <span className={cn("pill", `pill-${tone}`)}>{dot && <span className="pill-dot" aria-hidden="true" />}{children}</span>;
}

export function EligibilityPill({ value }: { value: Eligibility }) {
  return <Pill tone={{ eligible: "green", ineligible: "rose", clarification: "amber", not_screened: "gray" }[value]} dot>{ELIGIBILITY[value]}</Pill>;
}

export function ReviewPill({ value }: { value: "pending" | "draft" | "submitted" }) {
  return <Pill tone={{ pending: "gray", draft: "amber", submitted: "green" }[value]} dot>{{ pending: "Pending", draft: "Draft", submitted: "Submitted" }[value]}</Pill>;
}

export function Empty({ title, description }: { title: string; description: string }) {
  return <div className="empty"><span className="empty-icon"><Inbox size={22} /></span><h3>{title}</h3><p>{description}</p></div>;
}

export function Notice({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "warning" | "success" }) {
  return <div className={cn("notice", `notice-${tone}`)}><CircleHelp size={17} aria-hidden="true" /><div>{children}</div></div>;
}

export function DemoLabel() {
  return <div className="demo-label"><FlaskConical size={14} aria-hidden="true" /> Demonstration platform — synthetic applicant data</div>;
}
