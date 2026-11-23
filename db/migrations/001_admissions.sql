create type public.eligibility as enum ('not_screened','eligible','ineligible','clarification');
create type public.review_state as enum ('pending','draft','submitted');

create table public.profiles (
  id uuid primary key references auth.users(id),
  name text not null check (char_length(name) between 2 and 80),
  role text not null check (role in ('admin','evaluator')),
  seat smallint unique check (seat between 1 and 5),
  active boolean not null default true,
  check ((role = 'evaluator') = (seat is not null))
);
create table public.rubrics (
  version integer primary key,
  weights integer[] not null check (array_ndims(weights) = 1 and cardinality(weights) = 5),
  reason text not null,
  created_at timestamptz not null default now()
);
insert into public.rubrics values (1, array[20,25,20,20,15], 'Initial illustrative framework', now());
create table public.cycles (
  id integer primary key check (id = 1),
  name text not null,
  eligibility_version integer not null default 1,
  rubric_version integer not null default 1 references public.rubrics,
  min_overlap integer not null default 20 check (min_overlap between 2 and 200),
  disagreement_threshold numeric not null default 30,
  close_threshold numeric not null default 0.5,
  locked boolean not null default false,
  revision integer not null default 0
);
insert into public.cycles (id,name) values (1,'Data Science Foundations intake');
create table public.applications (
  id text primary key check (id ~ '^SEL-[0-9]{4}$'),
  cycle_id integer not null default 1 references public.cycles,
  name text not null,
  email text not null unique,
  location text not null,
  education text not null,
  academic numeric check (academic between 0 and 100),
  subjects text[] not null,
  skills text[] not null,
  motivation text not null,
  statement text not null,
  projects text not null,
  extracurricular text not null,
  notes text not null,
  declaration boolean not null,
  duplicate_of text references public.applications,
  submitted_at timestamptz not null,
  eligibility public.eligibility not null default 'not_screened',
  eligibility_reason text not null,
  synthetic boolean not null default true
);
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  cycle_id integer not null default 1 references public.cycles,
  application_id text not null references public.applications,
  evaluator_id uuid not null references public.profiles,
  rubric_version integer not null default 1 references public.rubrics,
  status public.review_state not null default 'pending',
  ratings smallint[] not null default array[null,null,null,null,null]::smallint[],
  comments text[] not null default array['','','','',''],
  feedback text not null default '',
  raw_score numeric,
  version integer not null default 0,
  seeded boolean not null default false,
  updated_at timestamptz not null default now(),
  submitted_at timestamptz,
  unique (cycle_id, application_id, evaluator_id, rubric_version),
  check (raw_score is null or raw_score between 20 and 100),
  check (cardinality(ratings)=5 and cardinality(comments)=5),
  check ((status='submitted') = (submitted_at is not null and raw_score is not null))
);
create index reviews_evaluator on public.reviews(evaluator_id,rubric_version);
create table public.audit (
  id bigint generated always as identity primary key,
  actor uuid references public.profiles,
  action text not null,
  entity text not null,
  detail jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create table public.resolutions (
  application_id text primary key references public.applications,
  signature text not null,
  reason text not null,
  actor uuid not null references public.profiles,
  created_at timestamptz not null default now()
);
create table public.snapshots (
  id bigint generated always as identity primary key,
  cycle_id integer not null references public.cycles,
  revision integer not null unique,
  source_revision integer not null,
  size integer not null check (size > 0),
  reason text not null,
  created_by uuid not null references public.profiles,
  created_at timestamptz not null default now(),
  metadata jsonb not null,
  ranking jsonb not null
);

alter table public.profiles enable row level security;
alter table public.rubrics enable row level security;
alter table public.cycles enable row level security;
alter table public.applications enable row level security;
alter table public.reviews enable row level security;
alter table public.audit enable row level security;
alter table public.resolutions enable row level security;
alter table public.snapshots enable row level security;

create function public.current_role() returns text
language sql stable security definer set search_path = '' as $$
  select role from public.profiles where id=(select auth.uid()) and active
$$;
create policy profiles_read on public.profiles for select to authenticated using (
  (select public.current_role())='admin' or (active and id=(select auth.uid()))
);
create policy rubrics_read on public.rubrics for select to authenticated using ((select public.current_role()) is not null);
create policy cycles_read on public.cycles for select to authenticated using ((select public.current_role()) is not null);
create policy reviews_read on public.reviews for select to authenticated using (
  (select public.current_role())='admin' or
  ((select public.current_role())='evaluator' and evaluator_id=(select auth.uid()))
);
create policy applications_read on public.applications for select to authenticated using (
  (select public.current_role())='admin' or
  ((select public.current_role())='evaluator' and eligibility='eligible' and exists (
    select 1 from public.reviews r join public.cycles c on c.id=r.cycle_id and c.rubric_version=r.rubric_version
    where r.application_id=applications.id and r.evaluator_id=(select auth.uid())
  ))
);
create policy audit_read on public.audit for select to authenticated using ((select public.current_role())='admin');
create policy resolutions_read on public.resolutions for select to authenticated using ((select public.current_role())='admin');
create policy snapshots_read on public.snapshots for select to authenticated using ((select public.current_role())='admin');
revoke all on public.profiles, public.rubrics, public.cycles, public.applications, public.reviews,
  public.audit, public.resolutions, public.snapshots from anon, authenticated;
grant select on public.profiles, public.rubrics, public.cycles, public.applications, public.reviews,
  public.audit, public.resolutions, public.snapshots to authenticated;

create function public.save_review(p_id uuid, p_version integer, p_ratings smallint[], p_comments text[],
  p_feedback text, p_submit boolean) returns public.reviews
language plpgsql security definer set search_path = '' as $$
declare
  c public.cycles;
  r public.reviews;
  w integer[];
  points numeric;
begin
  if public.current_role() is distinct from 'evaluator' then raise exception 'Evaluator access is required.'; end if;
  select * into c from public.cycles where id=1 for update;
  if public.current_role() is distinct from 'evaluator' then raise exception 'Evaluator access is required.'; end if;
  if c.locked then raise exception 'The evaluation cycle is locked.'; end if;
  select * into r from public.reviews where id=p_id and evaluator_id=auth.uid() and rubric_version=c.rubric_version
    and exists (select 1 from public.applications a where a.id=application_id and a.eligibility='eligible');
  if not found then raise exception 'This review is not assigned to your account or the application is no longer eligible.'; end if;
  if r.version is distinct from p_version then raise exception 'This review changed in another session. Reload it before saving.'; end if;
  if r.status='submitted' then raise exception 'An administrator must reopen a submitted review.'; end if;
  if p_submit is null or p_ratings is null or array_ndims(p_ratings)<>1 or cardinality(p_ratings)<>5
    or p_comments is null or array_ndims(p_comments)<>1 or cardinality(p_comments)<>5
    or p_feedback is null or char_length(p_feedback)>4000
    or exists (select from unnest(p_ratings) v where v<1 or v>5)
    or exists (select from unnest(p_comments) v where v is null or char_length(v)>1500) then
    raise exception 'Enter valid ratings and comments.';
  end if;
  if p_submit then
    if array_position(p_ratings,null) is not null or char_length(btrim(p_feedback))<12 then
      raise exception 'Score all five criteria and write at least 12 characters of overall feedback.';
    end if;
    select weights into w from public.rubrics where version=c.rubric_version;
    select sum(x.rating::numeric*w[x.n]/5) into points from unnest(p_ratings) with ordinality x(rating,n);
  end if;
  update public.reviews set ratings=p_ratings, comments=p_comments, feedback=p_feedback,
    status=case when p_submit then 'submitted'::public.review_state else 'draft'::public.review_state end,
    raw_score=points, version=version+1, seeded=false, updated_at=now(), submitted_at=case when p_submit then now() end
    where id=p_id returning * into r;
  update public.cycles set revision=revision+1 where id=1;
  if p_submit then
    insert into public.audit(actor,action,entity,detail) values
      (auth.uid(),'Review submitted',r.application_id,jsonb_build_object('review_id',r.id,'score',points,'rubric_version',r.rubric_version));
  end if;
  return r;
end $$;

create function public.ranking_state() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare result jsonb;
begin
  if public.current_role() is distinct from 'admin' then raise exception 'Administrator access is required.'; end if;
  with c as (select * from public.cycles where id=1),
  panel as (
    select id,name,seat from public.profiles where role='evaluator'
  ), eligible as (
    select id,name from public.applications where eligibility='eligible'
  ), submissions as (
    select r.application_id, r.evaluator_id, r.raw_score, r.version, p.seat
    from public.reviews r join c on r.rubric_version=c.rubric_version
    join panel p on p.id=r.evaluator_id join eligible a on a.id=r.application_id
    where r.status='submitted'
  ), coverage as (
    select e.id, e.name, count(s.evaluator_id)::int as reviews
    from eligible e left join submissions s on s.application_id=e.id group by e.id,e.name
  ), common as (
    select s.* from submissions s join coverage v on v.id=s.application_id and v.reviews=5
  ), calibration as (
    select (select count(*) from coverage where reviews=5)::int as overlap,
      (select avg(raw_score) from common) as panel_mean,
      (select count(*) from coverage where reviews=5)>=c.min_overlap as available from c
  ), means as (
    select evaluator_id,avg(raw_score) as reviewer_mean from common group by evaluator_id
  ), calibrated as (
    select s.*, case when k.available then greatest(0,least(100,s.raw_score+(k.panel_mean-m.reviewer_mean))) end as normalized
    from submissions s cross join calibration k left join means m using(evaluator_id)
  ), totals as (
    select application_id, avg(raw_score) as raw, avg(normalized) as normalized,
      max(raw_score)-min(raw_score) as spread,
      md5(string_agg(evaluator_id::text||':'||version::text,',' order by seat)) as signature
    from calibrated group by application_id having count(*)=5
  ), ranked as (
    select v.id,v.name,v.reviews,t.raw,t.normalized,t.spread,t.signature,
      (s.signature=t.signature) is true as resolved, s.reason as resolution_reason,
      row_number() over (order by coalesce(t.normalized,t.raw) desc,t.raw desc,v.id collate "C") as rank,
      row_number() over (order by t.raw desc,v.id collate "C") as raw_rank
    from totals t join coverage v on v.id=t.application_id left join public.resolutions s on s.application_id=v.id
  ), reviewers as (
    select p.id,p.name,p.seat,m.reviewer_mean,k.panel_mean-m.reviewer_mean as adjustment,
      (select avg(raw_score) from submissions where evaluator_id=p.id) as raw_average,
      (select avg(normalized) from calibrated where evaluator_id=p.id) as normalized_average
    from panel p cross join calibration k left join means m on m.evaluator_id=p.id
  )
  select jsonb_build_object(
    'revision',c.revision,'cycle',c.name,'rubric_version',c.rubric_version,'eligibility_version',c.eligibility_version,
    'threshold',c.disagreement_threshold,'close_threshold',c.close_threshold,'minimum',c.min_overlap,'locked',c.locked,
    'method',case when k.available then 'Reviewer mean-centering' else 'Raw mean (insufficient overlap)' end,
    'available',k.available,'overlap',k.overlap,'panel_mean',k.panel_mean,
    'total',(select count(*) from public.applications),
    'unresolved',(select count(*) from public.applications where eligibility in ('not_screened','clarification')),
    'pending',(select count(*) from coverage where reviews<>5),
    'coverage_completed',(select count(*) from submissions),
    'coverage_expected',(select count(*)*5 from eligible),
    'rows',coalesce((select jsonb_agg(to_jsonb(r) order by r.rank) from ranked r),'[]'::jsonb),
    'pending_rows',coalesce((select jsonb_agg(to_jsonb(v) order by v.id) from coverage v where v.reviews<>5),'[]'::jsonb),
    'reviewers',coalesce((select jsonb_agg(to_jsonb(r) order by r.seat) from reviewers r),'[]'::jsonb)
  ) into result from c cross join calibration k;
  return result;
end $$;

create function public.admin_change(p_action text,p_entity text,p_details jsonb,p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  c public.cycles; a public.applications; r public.reviews; u public.profiles;
  next_status public.eligibility; w integer[]; n integer; flag jsonb; previous jsonb;
begin
  if public.current_role() is distinct from 'admin' then raise exception 'Administrator access is required.'; end if;
  if p_reason is null or char_length(btrim(p_reason)) not between 8 and 1500 then raise exception 'Enter a reason of 8 to 1500 characters.'; end if;
  select * into c from public.cycles where id=1 for update;
  if c.locked and p_action not in ('Cycle reopened','Evaluator updated') then raise exception 'Reopen the cycle before making this change.'; end if;
  case p_action
    when 'Eligibility updated' then
      select * into strict a from public.applications where id=p_entity;
      next_status := (p_details->>'status')::public.eligibility;
      previous := jsonb_build_object('status',a.eligibility,'reason',a.eligibility_reason);
      update public.applications set eligibility=next_status, eligibility_reason=btrim(p_reason) where id=p_entity;
      if next_status='eligible' then
        insert into public.reviews(application_id,evaluator_id,rubric_version)
          select a.id,id,c.rubric_version from public.profiles where role='evaluator'
          on conflict do nothing;
      end if;
    when 'Review reopened' then
      select * into strict r from public.reviews where id=p_entity::uuid and rubric_version=c.rubric_version and status='submitted';
      previous := jsonb_build_object('application',r.application_id,'raw_score',r.raw_score,'ratings',r.ratings,
        'comments',r.comments,'feedback',r.feedback,'submitted_at',r.submitted_at);
      update public.reviews set status='draft',raw_score=null,submitted_at=null,version=version+1,updated_at=now() where id=r.id;
    when 'Assignments restored' then
      select * into strict a from public.applications where id=p_entity and eligibility='eligible';
      insert into public.reviews(application_id,evaluator_id,rubric_version)
        select a.id,id,c.rubric_version from public.profiles where role='evaluator' on conflict do nothing;
    when 'Assignment removed' then
      select * into strict r from public.reviews where id=p_entity::uuid and rubric_version=c.rubric_version and status='pending';
      previous := jsonb_build_object('application',r.application_id,'evaluator',r.evaluator_id);
      delete from public.reviews where id=r.id;
    when 'Disagreement reviewed' then
      select item into flag from jsonb_array_elements(public.ranking_state()->'rows') item where item->>'id'=p_entity;
      if flag is null or (flag->>'spread')::numeric<c.disagreement_threshold then raise exception 'No current disagreement flag exists.'; end if;
      if p_details->>'signature' is distinct from flag->>'signature' then raise exception 'Scores changed. Refresh the ranking and inspect the new reviews.'; end if;
      insert into public.resolutions(application_id,signature,reason,actor)
        values(p_entity,flag->>'signature',p_reason,auth.uid())
        on conflict(application_id) do update set signature=excluded.signature,reason=excluded.reason,actor=excluded.actor,created_at=now();
    when 'Cycle locked' then
      update public.cycles set locked=true where id=1 and not locked;
      if not found then raise exception 'The cycle is already locked.'; end if;
    when 'Cycle reopened' then
      update public.cycles set locked=false where id=1 and locked;
      if not found then raise exception 'The cycle is already open.'; end if;
    when 'Evaluator updated' then
      select * into strict u from public.profiles where id=p_entity::uuid and role='evaluator';
      previous := jsonb_build_object('name',u.name,'active',u.active);
      update public.profiles set name=btrim(p_details->>'name'),active=(p_details->>'active')::boolean where id=u.id;
    when 'Rubric revised' then
      select array_agg(value::integer order by ord) into w from jsonb_array_elements_text(p_details->'weights') with ordinality t(value,ord);
      if cardinality(w) is distinct from 5 or (select sum(v) from unnest(w) v) is distinct from 100
        or exists(select from unnest(w) v where v is null or v<1 or v>96) then raise exception 'Five positive weights must total 100.'; end if;
      select max(version)+1 into n from public.rubrics;
      insert into public.rubrics(version,weights,reason) values(n,w,p_reason);
      update public.cycles set rubric_version=n where id=1;
      insert into public.reviews(application_id,evaluator_id,rubric_version)
        select applicant.id,person.id,n from public.applications applicant cross join public.profiles person
        where applicant.eligibility='eligible' and person.role='evaluator';
      previous := jsonb_build_object('rubric_version',c.rubric_version);
    else raise exception 'Unknown administration action.';
  end case;
  update public.cycles set revision=revision+1 where id=1;
  insert into public.audit(actor,action,entity,detail) values
    (auth.uid(),p_action,p_entity,jsonb_build_object('reason',p_reason,'before',previous,'change',p_details));
end $$;

create function public.finalize_shortlist(p_size integer,p_expected_revision integer,p_reason text) returns bigint
language plpgsql security definer set search_path = '' as $$
declare c public.cycles; report jsonb; entries jsonb; next_revision integer; snapshot_id bigint; gap numeric;
begin
  if public.current_role() is distinct from 'admin' then raise exception 'Administrator access is required.'; end if;
  select * into c from public.cycles where id=1 for update;
  if c.revision is distinct from p_expected_revision then raise exception 'The underlying data changed. Refresh the shortlist preview and try again.'; end if;
  if not c.locked then raise exception 'Lock the evaluation cycle before publishing a shortlist.'; end if;
  if p_size is null or p_size<1 or p_size>200 or p_reason is null or char_length(btrim(p_reason)) not between 8 and 1500 then
    raise exception 'Enter a valid shortlist size and a publication reason.';
  end if;
  report := public.ranking_state();
  entries := report->'rows';
  if jsonb_array_length(entries)<p_size then raise exception 'There are too few qualified applicants.'; end if;
  if (report->>'unresolved')::integer>0 or (report->>'pending')::integer>0 then
    raise exception 'Resolve all screening decisions and complete the five-review panel for every eligible candidate.';
  end if;
  if exists (select from jsonb_array_elements(entries) item
    where (item->>'spread')::numeric >= c.disagreement_threshold and not (item->>'resolved')::boolean) then
    raise exception 'Review outstanding score disagreement flags before publishing.';
  end if;
  if exists (select from public.snapshots where source_revision=c.revision and size=p_size) then
    raise exception 'This shortlist has already been published with the current data and size.';
  end if;
  gap := coalesce((entries->(p_size-1)->>'normalized')::numeric,(entries->(p_size-1)->>'raw')::numeric)
       - coalesce((entries->p_size->>'normalized')::numeric,(entries->p_size->>'raw')::numeric);
  select coalesce(max(revision),0)+1 into next_revision from public.snapshots;
  insert into public.snapshots(cycle_id,revision,source_revision,size,reason,created_by,metadata,ranking)
    values(1,next_revision,c.revision,p_size,btrim(p_reason),auth.uid(),
      (report-'rows'-'pending_rows')||jsonb_build_object('cutoff_gap',gap,'weights',
       (select weights from public.rubrics where version=c.rubric_version)),entries)
    returning id into snapshot_id;
  insert into public.audit(actor,action,entity,detail) values
    (auth.uid(),case when next_revision=1 then 'Shortlist finalized' else 'Shortlist revised' end,snapshot_id::text,
      jsonb_build_object('size',p_size,'revision',next_revision,'reason',p_reason,'cutoff_gap',gap));
  return snapshot_id;
end $$;

revoke execute on function public.current_role(), public.ranking_state(),
  public.save_review(uuid,integer,smallint[],text[],text,boolean), public.admin_change(text,text,jsonb,text),
  public.finalize_shortlist(integer,integer,text) from public, anon;
grant execute on function public.current_role(), public.ranking_state(),
  public.save_review(uuid,integer,smallint[],text[],text,boolean), public.admin_change(text,text,jsonb,text),
  public.finalize_shortlist(integer,integer,text) to authenticated;
