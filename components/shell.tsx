"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import {
  ArrowDownToLine, ArrowUpRight, BookOpenText, CalendarDays, ChartNoAxesCombined, ClipboardCheck, ChevronDown,
  ChevronRight, House, ListChecks, LockKeyhole, LogOut, Menu, PanelLeftClose, PanelLeftOpen, Search, Settings2,
  UsersRound, FolderOpen, type LucideIcon,
} from "lucide-react";
import { DemoLabel, Avatar, Brand } from "@/components/common";
import { WorkspaceSearch } from "@/components/workspace-search";
import { Button, cn } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { signOut } from "@/lib/actions";
import type { Cycle, Profile } from "@/lib/model";

type NavItem = { href: string; label: string; icon: LucideIcon; admin?: boolean };

const navigation: { group: string; items: NavItem[] }[] = [
  { group: "Workspace", items: [
    { href: "/dashboard", label: "Overview", icon: House },
    { href: "/applications", label: "Applications", icon: FolderOpen },
    { href: "/reviews", label: "Reviews", icon: ClipboardCheck },
  ] },
  { group: "Selection", items: [
    { href: "/rankings", label: "Rankings", icon: ChartNoAxesCombined, admin: true },
    { href: "/shortlists", label: "Shortlists", icon: ListChecks, admin: true },
    { href: "/evaluators", label: "Evaluators", icon: UsersRound, admin: true },
    { href: "/reports", label: "Reports", icon: ArrowDownToLine, admin: true },
  ] },
  { group: "Reference", items: [
    { href: "/methodology", label: "Methodology", icon: BookOpenText },
    { href: "/settings", label: "Settings", icon: Settings2, admin: true },
  ] },
];

export function Shell({ profile, cycle, children }: { profile: Profile; cycle: Cycle; children: ReactNode }) {
  const [drawer, setDrawer] = useState(false);
  const [search, setSearch] = useState(false);
  const [compact, setCompact] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const admin = profile.role === "admin";
  const groups = navigation.map(({ group, items }) => ({ group, items: items.filter((item) => !item.admin || admin) }));
  const commands = groups.flatMap(({ items }) => items);
  const top = commands.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));
  const detail = pathname.split("/")[2];

  useEffect(() => {
    function openSearch(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearch((open) => !open);
      }
    }
    window.addEventListener("keydown", openSearch);
    return () => window.removeEventListener("keydown", openSearch);
  }, []);

  useEffect(() => {
    if (!["/dashboard", "/rankings", "/evaluators"].includes(pathname)) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, 90_000);
    return () => window.clearInterval(timer);
  }, [pathname, router]);

  function navigate(href: string) {
    if (!window.dispatchEvent(new Event("selectra:leave-review", { cancelable: true }))) return;
    setSearch(false);
    router.push(href);
  }

  const menu = <nav className="side-nav" aria-label="Main navigation">
    {groups.filter(({ items }) => items.length > 0).map(({ group, items }) => <div className="nav-group" key={group}>
      <div className="nav-label">{group}</div>
      {items.map(({ href, label, icon: Icon }) => <Link key={href} href={href} prefetch={false} onClick={() => setDrawer(false)}
        className={cn("nav-link", top?.href === href && "nav-active")}
        aria-label={label} title={label} aria-current={top?.href === href ? "page" : undefined}>
        <Icon size={17} strokeWidth={1.8} /><span>{label}</span>{top?.href === href && <span className="nav-active-marker" />}
      </Link>)}
    </div>)}
  </nav>;

  return <div className={cn("app-shell", compact && "sidebar-compact")}>
    <a href="#main-content" className="skip-link">Skip to content</a>
    <aside className="sidebar" id="workspace-sidebar">
      <Link href="/dashboard" prefetch={false} className="sidebar-brand" aria-label="Selectra overview"><Brand /></Link>
      <button type="button" className="side-command" aria-label="Open workspace search" title="Open workspace search (Ctrl K)" onClick={() => setSearch(true)}>
        <Search size={16} /><span>Search workspace</span><kbd>Ctrl K</kbd>
      </button>
      {menu}
      <div className="side-footer">
        <Link href={admin ? "/settings" : "/methodology"} prefetch={false} className="cycle-side" title={cycle.name}>
          <span className="cycle-glyph"><CalendarDays size={17} /></span>
          <span className="cycle-side-copy"><small>Evaluation cycle</small><strong>{cycle.name}</strong>
            <span><i className={cn("cycle-indicator", cycle.locked && "cycle-indicator-locked")} />{cycle.locked ? "Locked" : cycle.intake_open ? "Intake open" : "Intake paused"}</span></span>
          <ArrowUpRight size={13} />
        </Link>
      </div>
    </aside>
    <div className="app-body">
      <header className="topbar">
        <div className="topbar-left">
          <Dialog open={drawer} onOpenChange={setDrawer}>
            <DialogTrigger asChild><Button className="mobile-menu" variant="ghost" size="icon" aria-label="Open navigation"><Menu size={21} /></Button></DialogTrigger>
            <DialogContent title="Selectra navigation" description="Browse your workspace." className="mobile-drawer">{menu}</DialogContent>
          </Dialog>
          <Button type="button" size="icon" variant="ghost" className="desktop-sidebar-toggle" aria-label={compact ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!compact} aria-controls="workspace-sidebar" onClick={() => setCompact(!compact)}>
            {compact ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </Button>
          <div className="breadcrumbs"><span className="breadcrumb-root">Admissions</span><ChevronRight className="breadcrumb-root" size={13} />
            {detail && top ? <Link href={top.href}>{top.label}</Link> : <strong>{top?.label ?? "Overview"}</strong>}
            {detail && <><ChevronRight size={13} /><strong>{detail.startsWith("SEL-") ? detail : "Applicant review"}</strong></>}
          </div>
        </div>
        <div className="topbar-actions">
          <div className="topbar-demo"><DemoLabel /></div>
          <Dialog open={search} onOpenChange={setSearch}>
            <DialogTrigger asChild><button className="global-search" aria-label="Search applicants" title="Search the workspace or find an applicant"><Search size={17} /><span>Find anything</span><kbd>Ctrl K</kbd></button></DialogTrigger>
            <DialogContent title="Search workspace" description="Jump to a page or search the applicant directory." className="command-dialog">
              <WorkspaceSearch commands={commands} navigate={navigate} />
            </DialogContent>
          </Dialog>
          <details className="account-menu">
            <summary aria-label="Account menu">
              <Avatar name={profile.name} size="small" />
              <span className="account-name"><strong>{profile.name}</strong><small>{admin ? "Administrator" : "Evaluator"}</small></span><ChevronDown size={13} />
            </summary>
            <div className="account-dropdown"><span><LockKeyhole size={14} /> {admin ? "Administrator" : "Evaluator"} session</span>
              <form action={signOut} data-account-signout><Button variant="ghost" type="submit"><LogOut size={15} /> Sign out</Button></form>
            </div>
          </details>
        </div>
      </header>
      <main id="main-content" className="main-content">{children}<footer className="main-footer"><DemoLabel /><Link href="/">Selectra home <ArrowUpRight size={12} /></Link></footer></main>
    </div>
  </div>;
}
