"use client";

import { useFormStatus } from "react-dom";
import { ArrowUpRight, ClipboardCheck, FileText, LoaderCircle, ShieldCheck } from "lucide-react";
import { openDemo } from "@/lib/actions";
import { demoCredentials, demoRoles } from "@/lib/demo-preview";
import { Button } from "@/components/ui/button";

const roleIcons = { student: FileText, reviewer: ClipboardCheck, administrator: ShieldCheck };

export function DemoRolePicker({ variant }: { variant: "cards" | "buttons" }) {
  return <form aria-label="One-click demo access" action={openDemo}>
    <DemoRoleOptions variant={variant} />
  </form>;
}

function DemoRoleOptions({ variant }: { variant: "cards" | "buttons" }) {
  const { pending, data } = useFormStatus();
  const selected = pending ? demoRoles.find((role) => role === data?.get("role")) : undefined;
  const cards = variant === "cards";
  return <>
    <div className={cards ? "lp-demo-grid" : "demo-access-roles"} aria-busy={pending}>
      {demoRoles.map((role) => {
        const Icon = roleIcons[role];
        const { label, description } = demoCredentials[role];
        const arrow = selected === role
          ? <LoaderCircle className="spin" size={cards ? 18 : 14} aria-hidden="true" />
          : <ArrowUpRight className={cards ? "lp-role-arrow" : undefined} size={cards ? 18 : 14} aria-hidden="true" />;
        return cards ? <button key={role} type="submit" name="role" value={role} className="lp-role-card" disabled={pending} data-opening={selected === role || undefined}>
          <span className="lp-role-icon"><Icon size={22} aria-hidden="true" /></span>
          <span><strong>{label}</strong><span>{description}</span></span>{arrow}
        </button> : <Button key={role} type="submit" name="role" value={role} variant="outline" disabled={pending} data-opening={selected === role || undefined}>
          {label} demo {arrow}
        </Button>;
      })}
    </div>
    <div className="demo-open-status" role="status">
      {selected && <>
        <p>Opening {demoCredentials[selected].label.toLowerCase()} demo…</p>
        <div className="demo-open-shapes" aria-hidden="true"><span className="skeleton" /><span className="skeleton" /><span className="skeleton" /></div>
      </>}
    </div>
  </>;
}
