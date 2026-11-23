import Link from "next/link";
import type { ReactNode } from "react";
import { Brand } from "@/components/common";

export function PublicHeader({ navigation, children }: { navigation?: ReactNode; children?: ReactNode }) {
  return <header className="site-header">
    <div className="site-width site-header-inner">
      <Link href="/" className="site-brand" aria-label="Selectra home"><Brand /></Link>
      {navigation && <nav className="site-nav" aria-label="Main navigation">{navigation}</nav>}
      {children && <div className="site-actions">{children}</div>}
    </div>
  </header>;
}
