import Link from "next/link";
import { ChevronLeft, ChevronRight, Search, UsersRound } from "lucide-react";
import { Avatar, Card, CardHeading, Empty, PageIntro, Pill } from "@/components/common";
import { Button } from "@/components/ui/button";
import { ManageUser, NewEvaluator } from "@/components/user-management";
import { cycleContext, requireSession } from "@/lib/data";
import type { Profile } from "@/lib/model";
import "./users.css";

export const metadata = { title: "Users" };

type DirectoryAccount = Profile & { email: string; removed_at: string | null; application_id: string | null };
type Directory = { accounts: DirectoryAccount[]; count: number; open_seats: number[] };
type Filters = { role?: string; q?: string; page?: string };

export default async function Users({ searchParams }: { searchParams: Promise<Filters> }) {
  const [{ db }, { cycle }, params] = await Promise.all([requireSession(true), cycleContext(), searchParams]);
  const role = params.role === "student" || params.role === "evaluator" ? params.role : "";
  const q = typeof params.q === "string" ? params.q.trim().slice(0, 120) : "";
  const page = typeof params.page === "string" && /^\d{1,4}$/.test(params.page) ? Math.max(1, Number(params.page)) : 1;
  const { accounts, count, open_seats: seats } = await db.call<Directory>("select public.workspace_users($1,$2,$3) as value", [role || null, q, page]);

  function pageUrl(index: number) {
    return `/users?${new URLSearchParams({ ...(q && { q }), ...(role && { role }), page: String(index) })}`;
  }

  return <>
    <PageIntro eyebrow="Administration" title="Users" description="Find student and evaluator accounts, manage sign-in access, and add evaluators.">
      <NewEvaluator seats={cycle.locked ? [] : seats} />
    </PageIntro>
    <Card>
      <CardHeading title="Account directory" description={`${count} account${count === 1 ? "" : "s"}`}><UsersRound size={19} aria-hidden="true" /></CardHeading>
      <form className="users-filter" action="/users" method="get">
        <div className="field"><label htmlFor="users-q">Search accounts</label><input id="users-q" className="input" type="search" name="q" placeholder="Name or email" maxLength={120} defaultValue={q} /></div>
        <div className="field"><label htmlFor="users-role">Role</label><select className="input" id="users-role" name="role" defaultValue={role}>
          <option value="">All roles</option><option value="student">Students</option><option value="evaluator">Evaluators</option>
        </select></div>
        <Button type="submit" variant="outline"><Search size={15} /> Search</Button>
        {(role || q) && <Link href="/users" className="text-link">Clear filters</Link>}
      </form>
      {accounts.length ? <ul className="users-list" aria-label="Accounts">
        {accounts.map((person) => <li key={person.id}>
          <div className="users-identity"><Avatar name={person.name} /><div><strong>{person.name}</strong><p>{person.email}</p>
            {person.application_id && <Link className="text-link" href={`/applications/${person.application_id}`}>{person.application_id}</Link>}
          </div></div>
          <div className="users-tags"><Pill>{person.role === "student" ? "Student" : person.seat ? `Evaluator · Seat ${person.seat}` : "Evaluator · Supplemental"}</Pill>
            <Pill dot tone={person.removed_at ? "gray" : person.active ? "green" : "amber"}>{person.removed_at ? "Deleted" : person.active ? "Active" : "Blocked"}</Pill></div>
          {!person.removed_at && <ManageUser id={person.id} name={person.name} active={person.active} />}
        </li>)}
      </ul> : <Empty title="No accounts found" description={q || role ? "Try a different name, email, or role." : "New student and evaluator accounts appear here."} />}
      {(page > 1 || count > 25) && <nav className="users-pagination" aria-label="Account pages">
        {page > 1 && <Button asChild variant="outline" size="sm"><Link href={pageUrl(page - 1)}><ChevronLeft size={16} /> Previous</Link></Button>}
        <span>Page {page}</span>
        {count > page * 25 && <Button asChild variant="outline" size="sm"><Link href={pageUrl(page + 1)}>Next <ChevronRight size={16} /></Link></Button>}
      </nav>}
    </Card>
  </>;
}
