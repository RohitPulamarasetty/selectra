-- Accounts may evaluate supplemental assignments without changing the five-seat selection panel.
alter table public.profiles drop constraint profiles_check;
alter table public.profiles add constraint profile_evaluator_seat check (seat is null or role='evaluator');
alter table public.profiles add column removed_at timestamptz;
alter table public.profiles add constraint profile_removed_inactive check (removed_at is null or not active);

create or replace function public.ranking_state() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare result jsonb;
begin
  if public.current_role() is distinct from 'admin' then raise exception 'Administrator access is required.'; end if;
  with c as (select * from public.cycles where id=1),
  panel as (
    select id,name,seat from public.profiles where role='evaluator' and seat is not null
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

create or replace function public.admin_change(p_action text,p_entity text,p_details jsonb,p_reason text) returns void
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
          select a.id,id,c.rubric_version from public.profiles where role='evaluator' and seat is not null
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
        select a.id,id,c.rubric_version from public.profiles where role='evaluator' and seat is not null on conflict do nothing;
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
      select * into strict u from public.profiles where id=p_entity::uuid and role='evaluator' and removed_at is null;
      if not (p_details->>'active')::boolean then delete from auth.sessions where user_id=u.id; end if;
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
        where applicant.eligibility='eligible' and person.role='evaluator' and person.seat is not null;
      previous := jsonb_build_object('rubric_version',c.rubric_version);
    else raise exception 'Unknown administration action.';
  end case;
  update public.cycles set revision=revision+1 where id=1;
  insert into public.audit(actor,action,entity,detail) values
    (auth.uid(),p_action,p_entity,jsonb_build_object('reason',p_reason,'before',previous,'change',p_details));
end $$;

create or replace function public.student_portal_state() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare state jsonb;
begin
  if public.current_role() is distinct from 'student' then raise exception 'Student access is required.'; end if;
  select jsonb_build_object(
    'cycle',c.name, 'accepting',c.intake_open and not c.locked, 'id',a.id,
    'submitted_at',a.submitted_at, 'eligibility',a.eligibility,
    'completed_reviews',case when a.eligibility='eligible' then (
      select count(*) from public.reviews r join public.profiles p on p.id=r.evaluator_id and p.seat is not null where r.application_id=a.id and r.rubric_version=c.rubric_version and r.status='submitted'
    ) else 0 end,
    'decision',decision.result, 'decision_at',decision.created_at, 'decision_revision',decision.revision
  ) into state
  from public.cycles c
  left join public.student_applications s on s.owner_id=auth.uid()
  left join public.applications a on a.id=s.application_id
  left join lateral (
    select case when (row->>'rank')::int<=snap.size then 'shortlisted' else 'not_shortlisted' end result,
      snap.created_at,snap.revision
    from public.snapshots snap
    cross join lateral jsonb_array_elements(snap.ranking) as row
    where snap.cycle_id=c.id and row->>'id'=a.id
    order by snap.revision desc limit 1
  ) decision on a.id is not null where c.id=1;
  return state;
end $$;

create function public.workspace_users(p_role text,p_search text,p_page integer)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare directory jsonb;
begin
  if public.current_role() is distinct from 'admin' then raise exception 'Administrator access is required.'; end if;
  with accounts as (
    select p.id,p.name,u.email,p.role,p.seat,p.active,p.removed_at,u.created_at,s.application_id
    from public.profiles p join auth.users u on u.id=p.id
    left join public.student_applications s on s.owner_id=p.id
    where p.role in ('student','evaluator')
      and (p_role is null or p.role=p_role)
      and (coalesce(p_search,'')='' or strpos(lower(p.name || ' ' || u.email),lower(p_search))>0)
  ), page as (
    select * from accounts order by (removed_at is not null),created_at desc,id
    limit 25 offset (greatest(1,least(p_page,10000))-1)*25
  )
  select jsonb_build_object(
    'accounts',coalesce((select jsonb_agg(to_jsonb(page) order by (removed_at is not null),created_at desc,id) from page),'[]'::jsonb),
    'count',(select count(*) from accounts),
    'open_seats',array(select n from generate_series(1,5) n where not exists (select 1 from public.profiles where seat=n))
  ) into directory;
  return directory;
end $$;

create function public.create_evaluator(p_name text,p_email text,p_hash text,p_seat smallint)
returns void language plpgsql security definer set search_path = '' as $$
declare account_id uuid; c public.cycles;
begin
  if public.current_role() is distinct from 'admin' then raise exception 'Administrator access is required.'; end if;
  if char_length(btrim(coalesce(p_name,''))) not between 2 and 80
    or char_length(coalesce(p_email,'')) not between 3 and 254
    or p_hash is null or p_hash !~ '^[0-9a-f]{32}:[0-9a-f]{128}$' then
    raise exception 'Enter a valid name, email address, and password.';
  end if;
  select * into c from public.cycles where id=1 for update;
  if p_seat is not null and (c.locked or p_seat not between 1 and 5 or exists (select 1 from public.profiles where seat=p_seat)) then
    raise exception 'This panel seat is unavailable. Choose a different seat or create a supplemental evaluator.';
  end if;
  insert into auth.users(email,password_hash,raw_user_meta_data)
    values(lower(p_email),p_hash,jsonb_build_object('name',btrim(p_name)))
    on conflict(email) do nothing returning id into account_id;
  if account_id is null then raise exception 'An account already uses this email address.'; end if;
  update public.profiles set role='evaluator',seat=p_seat where id=account_id;
  if p_seat is not null then
    insert into public.reviews(application_id,evaluator_id,rubric_version)
      select id,account_id,c.rubric_version from public.applications where eligibility='eligible';
    update public.cycles set revision=revision+1 where id=1;
  end if;
  insert into public.audit(actor,action,entity,detail)
    values(auth.uid(),'Evaluator created',account_id::text,jsonb_build_object('name',btrim(p_name),'seat',p_seat));
end $$;

create function public.set_workspace_user(p_id uuid,p_action text)
returns void language plpgsql security definer set search_path = '' as $$
declare account public.profiles; action_name text;
begin
  if public.current_role() is distinct from 'admin' then raise exception 'Administrator access is required.'; end if;
  if p_action is null or p_action not in ('block','unblock','delete') then raise exception 'Choose an account action.'; end if;
  perform id from public.cycles where id=1 for update;
  select * into account from public.profiles where id=p_id and role in ('student','evaluator') and removed_at is null for update;
  if not found then raise exception 'This account is no longer available.'; end if;
  if p_action='unblock' then
    if account.active then return; end if;
    update public.profiles set active=true where id=p_id;
    action_name := 'Account unblocked';
  elsif p_action='block' then
    if not account.active then return; end if;
    update public.profiles set active=false where id=p_id;
    action_name := 'Account blocked';
  else
    if account.seat is null
      and not exists (select 1 from public.reviews where evaluator_id=p_id)
      and not exists (select 1 from public.student_applications where owner_id=p_id)
      and not exists (select 1 from public.audit where actor=p_id) then
      delete from public.profiles where id=p_id;
      delete from auth.users where id=p_id;
    else
      update public.profiles set active=false,removed_at=now() where id=p_id;
    end if;
    action_name := 'Account deleted';
  end if;
  delete from auth.sessions where user_id=p_id;
  insert into public.audit(actor,action,entity,detail)
    values(auth.uid(),action_name,p_id::text,jsonb_build_object('name',account.name,'role',account.role));
end $$;

create function public.assign_supplemental_review(p_application text,p_evaluator uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare c public.cycles; review_id uuid;
begin
  if public.current_role() is distinct from 'admin' then raise exception 'Administrator access is required.'; end if;
  select * into c from public.cycles where id=1 for update;
  if c.locked then raise exception 'Reopen the cycle before assigning a review.'; end if;
  if not exists (select 1 from public.applications where id=p_application and eligibility='eligible') then
    raise exception 'Only eligible applications can be assigned for review.';
  end if;
  if not exists (select 1 from public.profiles where id=p_evaluator and role='evaluator' and seat is null and active) then
    raise exception 'Choose an active supplemental evaluator.';
  end if;
  insert into public.reviews(application_id,evaluator_id,rubric_version)
    values(p_application,p_evaluator,c.rubric_version) on conflict do nothing returning id into review_id;
  if review_id is null then raise exception 'This application is already assigned to that evaluator.'; end if;
  insert into public.audit(actor,action,entity,detail)
    values(auth.uid(),'Supplemental review assigned',p_application,jsonb_build_object('review_id',review_id,'evaluator',p_evaluator));
end $$;

revoke execute on function public.workspace_users(text,text,integer), public.create_evaluator(text,text,text,smallint),
  public.set_workspace_user(uuid,text), public.assign_supplemental_review(text,uuid) from public, anon;
grant execute on function public.workspace_users(text,text,integer), public.create_evaluator(text,text,text,smallint),
  public.set_workspace_user(uuid,text), public.assign_supplemental_review(text,uuid) to authenticated;
