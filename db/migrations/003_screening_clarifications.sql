revoke all on sequence public.application_number from anon, authenticated;
alter policy cycles_read on public.cycles using ((select public.current_role()) in ('admin','evaluator'));
alter policy rubrics_read on public.rubrics using ((select public.current_role()) in ('admin','evaluator'));

create table public.student_clarifications (
  id bigint generated always as identity primary key,
  application_id text not null references public.applications(id) on delete cascade,
  question text not null check (char_length(question) between 10 and 600),
  response text check (char_length(response) between 12 and 1500),
  requested_at timestamptz not null default now(),
  responded_at timestamptz,
  check ((response is null) = (responded_at is null))
);
create index student_clarifications_application on public.student_clarifications(application_id,id desc);
alter table public.student_clarifications enable row level security;
revoke all on public.student_clarifications from anon, authenticated;
grant select on public.student_clarifications to authenticated;
create policy student_clarifications_read on public.student_clarifications for select to authenticated using (
  (select public.current_role())='admin' or (
    (select public.current_role())='student' and exists (
      select 1 from public.student_applications mine
      where mine.owner_id=(select auth.uid()) and mine.application_id=student_clarifications.application_id
    )
  )
);

create function public.request_student_clarification(p_application text,p_reason text,p_question text)
returns void language plpgsql security definer set search_path = '' as $$
declare question text;
begin
  if public.current_role() is distinct from 'admin' then raise exception 'Administrator access is required.'; end if;
  question := coalesce(nullif(btrim(p_question),''), 'Please provide more information about the application details that may need clarification.');
  if char_length(question) not between 10 and 600 then raise exception 'Enter a student-facing question of 10 to 600 characters.'; end if;
  perform public.admin_change('Eligibility updated',p_application,'{"status":"clarification"}',p_reason);
  if exists (select 1 from public.student_applications where application_id=p_application) then
    insert into public.student_clarifications(application_id,question) values(p_application,question);
  end if;
end $$;

create function public.reply_to_student_clarification(p_request bigint,p_response text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  owned_id text;
  screening public.eligibility;
  actor_id uuid;
begin
  actor_id := auth.uid();
  if public.current_role() is distinct from 'student' then raise exception 'Student access is required.'; end if;
  if char_length(btrim(coalesce(p_response,''))) not between 12 and 1500 then
    raise exception 'Enter a response of 12 to 1500 characters.';
  end if;
  select a.id,a.eligibility into owned_id,screening
    from public.student_applications s join public.applications a on a.id=s.application_id
    where s.owner_id=actor_id for update of a;
  if screening is distinct from 'clarification' or p_request is distinct from (
    select max(id) from public.student_clarifications where application_id=owned_id
  ) then raise exception 'This clarification request is no longer open.'; end if;
  update public.student_clarifications set response=btrim(p_response),responded_at=now()
    where id=p_request and application_id=owned_id and response is null;
  if not found then raise exception 'This clarification request already has a response.'; end if;
  insert into public.audit(actor,action,entity,detail)
    values(actor_id,'Clarification received',owned_id,jsonb_build_object('request',p_request));
end $$;

revoke execute on function public.request_student_clarification(text,text,text),
  public.reply_to_student_clarification(bigint,text) from public, anon;
grant execute on function public.request_student_clarification(text,text,text),
  public.reply_to_student_clarification(bigint,text) to authenticated;
