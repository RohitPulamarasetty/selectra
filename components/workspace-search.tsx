"use client";

import { useState, type FormEvent, type KeyboardEvent } from "react";
import { ArrowRight, Search, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export type WorkspaceCommand = { href: string; label: string; icon: LucideIcon };

export function WorkspaceSearch({ commands, navigate }: { commands: WorkspaceCommand[]; navigate: (href: string) => void }) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(-1);
  const term = query.trim();
  const matches = commands.filter(({ label }) => label.toLowerCase().includes(term.toLowerCase()));

  function keys(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" && matches[active]) {
      event.preventDefault();
      navigate(matches[active].href);
      return;
    }
    if (!matches.length) return;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setActive((current) => {
        const next = current + (event.key === "ArrowDown" ? 1 : -1);
        return next >= matches.length ? 0 : next < 0 ? matches.length - 1 : next;
      });
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    navigate(term ? `/applications?q=${encodeURIComponent(term)}` : "/applications");
  }

  return <form className="command-form" onSubmit={submit}>
    <label className="sr-only" htmlFor="global-query">Search query</label>
    <div className="command-input"><Search size={18} aria-hidden="true" />
      <input id="global-query" value={query} onChange={(event) => { setQuery(event.target.value); setActive(-1); }}
        onKeyDown={keys} className="input" type="text" role="combobox" aria-expanded={!!matches.length}
        aria-controls="workspace-commands" aria-activedescendant={active >= 0 && matches[active] ? `command-${active}` : undefined}
        placeholder="Page, applicant name, or ID" autoComplete="off" />
    </div>
    <div className="command-results" id="workspace-commands" role="listbox" aria-label="Workspace pages" hidden={!matches.length}>
      {matches.map(({ href, label, icon: Icon }, index) => <button type="button" role="option" key={href}
        id={`command-${index}`} aria-selected={index === active} onClick={() => navigate(href)}>
        <Icon size={16} /><span>{label}</span><ArrowRight size={14} />
      </button>)}
    </div>
    <div className="command-footer"><span><kbd>↑</kbd> <kbd>↓</kbd> Choose a page</span>
      <Button type="submit" variant="outline"><Search size={14} /> Search directory</Button>
    </div>
  </form>;
}
