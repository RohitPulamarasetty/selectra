"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Search } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { Avatar, Card, Empty, Pill, ReviewPill } from "@/components/common";
import { DataTable } from "@/components/data-table";
import { cn } from "@/components/ui/button";
import { dateLabel, score, type Review } from "@/lib/model";

export type QueueRow = { id: string; applicantId: string; name: string; location: string; status: Review["status"]; score: number | null; updated: string; seeded: boolean };
type Filter = "all" | "open" | Review["status"];

function matches(row: QueueRow, filter: Filter) {
  return filter === "all" || (filter === "open" ? row.status !== "submitted" : row.status === filter);
}

const columns: ColumnDef<QueueRow>[] = [
  { accessorKey: "name", header: "Applicant", cell: ({ row: { original: a } }) => <Link prefetch={false} href={`/reviews/${a.id}`} className="identity identity-link"><Avatar name={a.name} variant={Number(a.applicantId.slice(-2))} /><span><strong>{a.name}</strong><small>{a.applicantId}</small></span></Link> },
  { accessorKey: "location", header: "Location" },
  { accessorKey: "status", header: "Review status", cell: ({ row }) => <div className="inline-actions"><ReviewPill value={row.original.status} />{row.original.status !== "pending" && row.original.seeded && <Pill>Seeded example</Pill>}</div> },
  { accessorKey: "score", header: "Raw score", cell: ({ row }) => score(row.original.score) },
  { accessorKey: "updated", header: "Last updated", cell: ({ row }) => row.original.status === "pending" ? "—" : dateLabel(row.original.updated, true) },
  { id: "view", header: () => <span className="sr-only">Open review</span>, enableSorting: false, cell: ({ row: { original: a } }) => <Link prefetch={false} className="row-arrow" href={`/reviews/${a.id}`} aria-label={`Review ${a.name}`}><ArrowUpRight size={16} /></Link> },
];

export function ReviewQueue({ data }: { data: QueueRow[] }) {
  const [filter, setFilter] = useState<Filter>(data.some((row) => row.status !== "submitted") ? "open" : "all");
  const rows = useMemo(() => data.filter((row) => matches(row, filter)), [data, filter]);
  return <Card><DataTable data={rows} columns={columns} caption="Assigned reviews" getSearchText={(a) => `${a.name} ${a.applicantId} ${a.location}`}
    toolbar={<><label className="sr-only" htmlFor="queue-status">Review status filter</label><select className="input" id="queue-status" value={filter} onChange={(event) => setFilter(event.target.value as Filter)}>
      <option value="open">Open reviews</option><option value="all">All reviews</option><option value="pending">Pending</option><option value="draft">Drafts</option><option value="submitted">Submitted</option>
    </select></>} /></Card>;
}

export function ReviewRail({ data, selected }: { data: QueueRow[]; selected: string }) {
  const [filter, setFilter] = useState<Filter>(data.some((row) => row.id === selected && row.status !== "submitted") ? "open" : "all");
  const [query, setQuery] = useState("");
  const rows = data.filter((row) => matches(row, filter) && `${row.name} ${row.applicantId}`.toLowerCase().includes(query.toLowerCase().trim()));
  return <Card className="review-rail">
    <div className="rail-controls"><label className="table-search"><span className="sr-only">Find assigned review</span><Search size={14} /><input className="input" value={query} type="search" placeholder="Find applicant" onChange={(event) => setQuery(event.target.value)} /></label>
      <label className="sr-only" htmlFor="rail-status">Queue filter</label><select id="rail-status" className="input" value={filter} onChange={(event) => setFilter(event.target.value as Filter)}>
        <option value="all">All assigned</option><option value="open">Open reviews</option><option value="submitted">Submitted</option>
      </select></div>
    <div className="rail-items" aria-label="Assigned applicant list">
      {rows.length ? rows.map((row) => <Link prefetch={false} href={`/reviews/${row.id}`} key={row.id} aria-current={row.id === selected ? "page" : undefined} className={cn("rail-row", row.id === selected && "rail-current")}>
        <Avatar size="small" name={row.name} variant={Number(row.applicantId.slice(-2))} /><span><strong>{row.name}</strong><small>{row.applicantId}</small></span>
        <span title={row.status} aria-label={row.status} className={`rail-dot rail-${row.status}`} />
      </Link>) : <Empty title="No matches" description="Adjust your search." />}
    </div>
  </Card>;
}
