"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, ArrowUpRight, Minus } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { Avatar, Card, Pill } from "@/components/common";
import { DataTable } from "@/components/data-table";
import { score, type RankRow } from "@/lib/model";

export function RankingTable({ rows, threshold, shortlistSize, snapshot = false, showFilter = true }: {
  rows: RankRow[]; threshold: number; shortlistSize?: number; snapshot?: boolean; showFilter?: boolean;
}) {
  const [filter, setFilter] = useState("all");
  const displayed = useMemo(() => rows.filter((row) => filter === "all"
    || (filter === "flagged" && row.spread >= threshold && !row.resolved)
    || (filter === "moved" && row.raw_rank !== row.rank)), [rows, filter, threshold]);
  const columns = useMemo<ColumnDef<RankRow>[]>(() => [
    { accessorKey: "rank", header: "Rank", cell: ({ row }) => <strong className="rank-number">{row.original.rank.toString().padStart(2, "0")}</strong> },
    { accessorKey: "name", header: "Applicant", cell: ({ row: { original: a } }) => <Link href={`/applications/${a.id}`} className="identity identity-link">
      <Avatar name={a.name} variant={Number(a.id.slice(-2))} /><span><strong>{a.name}</strong><small>{a.id}</small></span>
    </Link> },
    { accessorKey: "raw", header: "Raw average", cell: ({ row }) => <span className="tabular">{score(row.original.raw)}</span> },
    { accessorKey: "normalized", header: "Normalized score", cell: ({ row }) => <strong className="rank-score">{score(row.original.normalized)}</strong> },
    { accessorKey: "reviews", header: "Reviews", cell: ({ row }) => <span className="tabular">{row.original.reviews}/5</span> },
    ...(shortlistSize === undefined ? [
      { accessorKey: "raw_rank", header: "Raw rank", cell: ({ row }: { row: { original: RankRow } }) => <span className="tabular">{row.original.raw_rank}</span> },
      { id: "movement", header: "Change", accessorFn: (a: RankRow) => a.raw_rank - a.rank, cell: ({ row }: { row: { original: RankRow } }) => {
        const moved = row.original.raw_rank - row.original.rank;
        return <span className={`rank-change ${moved > 0 ? "rank-up" : moved < 0 ? "rank-down" : ""}`}>{moved > 0 ? <ArrowUp size={12} /> : moved < 0 ? <ArrowDown size={12} /> : <Minus size={12} />}
          {moved ? Math.abs(moved) : <span className="sr-only">No change</span>}</span>;
      } },
    ] : []),
    { id: "selection", header: shortlistSize === undefined ? "Status" : "Selection", enableSorting: false, cell: ({ row }) => {
      const flagged = row.original.spread >= threshold && !row.original.resolved;
      if (flagged) return <Pill tone="amber" dot>Requires review</Pill>;
      if (shortlistSize === undefined) return <Pill tone="green" dot>Evaluation complete</Pill>;
      return row.original.rank <= shortlistSize ? <Pill tone="green" dot>{snapshot ? "Shortlisted" : "In preview"}</Pill> : <Pill>Not shortlisted</Pill>;
    } },
    { id: "view", header: () => <span className="sr-only">Open application</span>, enableSorting: false,
      cell: ({ row }) => <Link className="row-arrow" href={`/applications/${row.original.id}`} aria-label={`Open ${row.original.name}`}><ArrowUpRight size={15} /></Link> },
  ], [threshold, shortlistSize, snapshot]);
  return <Card><DataTable data={displayed} columns={columns} caption={shortlistSize == null ? "Applicant rankings" : "Shortlist ranking"}
    getSearchText={(row) => `${row.name} ${row.id}`} toolbar={showFilter && <>
      <label className="sr-only" htmlFor="ranking-view">Ranking filter</label><select className="input" id="ranking-view" value={filter} onChange={(event) => setFilter(event.target.value)}>
        <option value="all">All ranked applicants</option><option value="flagged">Requires review</option><option value="moved">Rank changed</option>
      </select></>} /></Card>;
}
