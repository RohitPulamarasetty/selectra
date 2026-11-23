"use client";

import { useState, type ReactNode } from "react";
import { ArrowDown, ArrowDownUp, ArrowUp, ChevronLeft, ChevronRight, Search } from "lucide-react";
import {
  flexRender, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, useReactTable,
  type ColumnDef, type SortingState,
} from "@tanstack/react-table";
import { Empty } from "@/components/common";
import { Button } from "@/components/ui/button";

export function DataTable<T>({ data, columns, initialQuery = "", query, setQuery, placeholder = "Search by name or ID", toolbar, caption, getSearchText, pageSize = 12 }: {
  data: T[]; columns: ColumnDef<T>[]; initialQuery?: string; query?: string; setQuery?: (value: string) => void;
  placeholder?: string; toolbar?: ReactNode; caption: string; getSearchText?: (row: T) => string; pageSize?: number;
}) {
  const [internalQuery, setInternalQuery] = useState(initialQuery);
  const [sorting, setSorting] = useState<SortingState>([]);
  const search = query ?? internalQuery;
  // TanStack's table instance is designed to manage state inside this client component.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data, columns, state: { sorting, globalFilter: search }, onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(), getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(), getSortedRowModel: getSortedRowModel(),
    initialState: { pagination: { pageIndex: 0, pageSize } },
    getColumnCanGlobalFilter: () => true,
    globalFilterFn: (row, _column, value) => !getSearchText || getSearchText(row.original).toLocaleLowerCase().includes(String(value).trim().toLocaleLowerCase()),
  });
  const count = table.getFilteredRowModel().rows.length;
  const { pageIndex, pageSize: limit } = table.getState().pagination;
  return <>
    {(getSearchText || toolbar) && <div className="table-toolbar">
      {getSearchText && <label className="table-search"><span className="sr-only">{placeholder}</span><Search size={16} /><input className="input" type="search" placeholder={placeholder} value={search}
        onChange={(event) => { (setQuery ?? setInternalQuery)(event.target.value); table.setPageIndex(0); }} /></label>}
      {toolbar && <div className="table-filter">{toolbar}</div>}
    </div>}
    <div className="table-scroll" tabIndex={0} role="region" aria-label={caption}>
      <table className="data-table"><caption className="sr-only">{caption}</caption>
        <thead>{table.getHeaderGroups().map((group) => <tr key={group.id}>{group.headers.map((header) => {
          const order = header.column.getIsSorted();
          return <th key={header.id} scope="col" aria-sort={order === "asc" ? "ascending" : order === "desc" ? "descending" : undefined}>
            {header.isPlaceholder ? null : header.column.getCanSort() ?
              <button onClick={header.column.getToggleSortingHandler()} type="button">{flexRender(header.column.columnDef.header, header.getContext())}
                {order === "asc" ? <ArrowUp size={12} /> : order === "desc" ? <ArrowDown size={12} /> : <ArrowDownUp size={11} />}</button>
              : flexRender(header.column.columnDef.header, header.getContext())}
          </th>;
        })}</tr>)}</thead>
        <tbody>{table.getRowModel().rows.map((row) => <tr key={row.id}>
          {row.getVisibleCells().map((cell) => <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>)}
        </tr>)}</tbody>
      </table>
    </div>
    {!count && <Empty title="No matching records" description="Try another search or adjust your filters." />}
    <div className="table-footer"><span>{count ? `Showing ${pageIndex * limit + 1}–${Math.min((pageIndex + 1) * limit, count)} of ${count}` : "0 results"}</span>
      {table.getPageCount() > 1 && <div className="pagination">
        <Button type="button" variant="outline" size="icon" aria-label="Previous page" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}><ChevronLeft size={15} /></Button>
        <span className="pager-label">Page {pageIndex + 1} of {table.getPageCount()}</span>
        <Button type="button" variant="outline" size="icon" aria-label="Next page" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}><ChevronRight size={15} /></Button>
      </div>}
    </div>
  </>;
}
