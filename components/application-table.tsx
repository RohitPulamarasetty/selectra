"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { ArrowUpRight } from "lucide-react";
import { Avatar, Card, EligibilityPill, Pill } from "@/components/common";
import { DataTable } from "@/components/data-table";
import { ELIGIBILITY, dateLabel, type Eligibility } from "@/lib/model";

export type DirectoryRow = {
  id: string; name: string; location: string; education: string; eligibility: Eligibility;
  submitted_at: string; reviews: number; expected: number; shortlisted: boolean; rankedInSnapshot: boolean;
};

const columns: ColumnDef<DirectoryRow>[] = [
  { accessorKey: "name", header: "Applicant", cell: ({ row }) => <Link prefetch={false} href={`/applications/${row.original.id}`} className="identity identity-link">
    <Avatar name={row.original.name} variant={Number(row.original.id.slice(-2))} />
    <span><strong>{row.original.name}</strong><small>{row.original.id}</small></span>
  </Link> },
  { accessorKey: "location", header: "Location" },
  { accessorKey: "education", header: "Education" },
  { accessorKey: "eligibility", header: "Eligibility", cell: ({ row }) => <EligibilityPill value={row.original.eligibility} /> },
  { accessorKey: "reviews", header: "Review status", cell: ({ row }) => {
    const a = row.original;
    if (a.shortlisted) return <Pill tone="green">Shortlisted</Pill>;
    if (a.rankedInSnapshot) return <Pill>Not shortlisted</Pill>;
    if (a.eligibility === "clarification" || a.eligibility === "not_screened") return <Pill tone="amber">Requires review</Pill>;
    if (a.eligibility !== "eligible") return <span className="muted">—</span>;
    return <Pill tone={a.reviews === a.expected ? "green" : "blue"}>{a.reviews === a.expected ? "Evaluation complete" : `${a.reviews}/${a.expected} submitted`}</Pill>;
  } },
  { accessorKey: "submitted_at", header: "Application date", cell: ({ row }) => dateLabel(row.original.submitted_at) },
  { id: "open", header: () => <span className="sr-only">Open applicant</span>, enableSorting: false, cell: ({ row }) => <Link prefetch={false} className="row-arrow" href={`/applications/${row.original.id}`} aria-label={`Open ${row.original.name}`}><ArrowUpRight size={16} /></Link> },
];

export function ApplicationTable({ data, query, admin, initialStatus }: {
  data: DirectoryRow[]; query: string; admin: boolean; initialStatus: Eligibility | "all";
}) {
  const [status, setStatus] = useState(initialStatus);
  const rows = useMemo(() => status === "all" ? data : data.filter((a) => a.eligibility === status), [data, status]);
  return <Card><DataTable data={rows} columns={columns} caption="Applicant directory" initialQuery={query} placeholder="Search applicants"
    getSearchText={(a) => [a.id, a.name, a.location, a.education].join(" ")}
    toolbar={admin && <><label htmlFor="directory-status" className="sr-only">Eligibility filter</label><select id="directory-status" className="input" value={status}
      onChange={(event) => setStatus(event.target.value as Eligibility | "all")}>
      <option value="all">All eligibility statuses</option>{Object.entries(ELIGIBILITY).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
    </select></>} /></Card>;
}
