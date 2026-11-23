-- Public signup always creates a student. Only the offline service can set staff roles.
alter table public.profiles drop constraint profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('admin','evaluator','student'));
alter table public.cycles add column intake_open boolean not null default true;

create function public.create_student_profile() returns trigger
language plpgsql security definer set search_path = '' as $$
declare display_name text;
begin
  display_name := left(btrim(coalesce(new.raw_user_meta_data->>'name','')),80);
  insert into public.profiles (id,name,role) values (
    new.id, case when char_length(display_name)>=2 then display_name else 'Student' end, 'student'
  ) on conflict (id) do nothing;
  return new;
end $$;

create trigger selectra_create_student_profile
after insert on auth.users for each row execute function public.create_student_profile();
revoke execute on function public.create_student_profile() from public, anon, authenticated;

create sequence public.application_number as integer minvalue 201 maxvalue 9999 start with 201;
select setval('public.application_number', greatest(200, coalesce(max(substring(id from 5)::int),200))+1, false)
  from public.applications;

create table public.student_applications (
  owner_id uuid primary key references public.profiles(id) on delete cascade,
  application_id text unique references public.applications(id),
  data jsonb not null default '{}'::jsonb,
  version integer not null default 0,
  updated_at timestamptz not null default now()
);
alter table public.student_applications enable row level security;
revoke all on public.student_applications from anon, authenticated;
grant select on public.student_applications to authenticated;
create policy student_application_read on public.student_applications for select to authenticated using (
  (select public.current_role())='student' and owner_id=(select auth.uid())
);

create function public.save_student_application(p_version integer, p_data jsonb, p_submit boolean)
returns public.student_applications
language plpgsql security definer set search_path = '' as $$
declare
  c public.cycles;
  draft public.student_applications;
  student public.profiles;
  form record;
  id text;
  subjects text[];
  skills text[];
  academic numeric;
begin
  if public.current_role() is distinct from 'student' then raise exception 'Student access is required.'; end if;
  if p_version is null or p_version<0 or p_submit is null or jsonb_typeof(p_data) is distinct from 'object' then
    raise exception 'The application format is invalid.';
  end if;
  select * into student from public.profiles where profiles.id=auth.uid();
  if p_submit then
    select * into c from public.cycles where cycles.id=1 for update;
  end if;

  insert into public.student_applications(owner_id) values(student.id) on conflict do nothing;
  select * into draft from public.student_applications where owner_id=student.id for update;
  if draft.application_id is not null then
    if p_submit then return draft; end if;
    raise exception 'A submitted application is read-only.';
  end if;
  if draft.version is distinct from p_version then
    raise exception 'This draft changed in another session. Refresh before saving.';
  end if;

  select * into form from jsonb_to_record(p_data) as fields(
    location text, education text, academic text, subjects text, skills text,
    motivation text, statement text, projects text, extracurricular text, notes text, declaration boolean
  );
  if greatest(char_length(form.location),char_length(form.education))>120
    or greatest(char_length(form.subjects),char_length(form.skills))>240
    or greatest(char_length(form.motivation),char_length(form.statement))>2000
    or greatest(char_length(form.projects),char_length(form.extracurricular),char_length(form.notes))>1000
    or char_length(p_data::text)>16000 then
    raise exception 'One or more answers exceed the allowed length.';
  end if;
  if coalesce(form.academic,'')<>'' then
    if form.academic !~ '^[0-9]{1,3}(\.[0-9]{1,2})?$' then raise exception 'Enter an academic result between 0 and 100.'; end if;
    academic := form.academic::numeric;
    if academic>100 then raise exception 'Enter an academic result between 0 and 100.'; end if;
  end if;

  if p_submit then
    if c.locked or not c.intake_open then raise exception 'The admission cycle is not accepting applications.'; end if;
    subjects := array(select btrim(value) from regexp_split_to_table(coalesce(form.subjects,''),',') as value where btrim(value)<>'');
    skills := array(select btrim(value) from regexp_split_to_table(coalesce(form.skills,''),',') as value where btrim(value)<>'');
    if char_length(btrim(coalesce(form.location,'')))<2 or char_length(btrim(coalesce(form.education,'')))<2
      or academic is null or cardinality(subjects)=0 or char_length(btrim(coalesce(form.motivation,'')))<40
      or char_length(btrim(coalesce(form.statement,'')))<40 or form.declaration is distinct from true then
      raise exception 'Complete the required application fields and declaration.';
    end if;
    id := 'SEL-'||lpad(nextval('public.application_number')::text,4,'0');
    insert into public.applications(id,cycle_id,name,email,location,education,academic,subjects,skills,motivation,
      statement,projects,extracurricular,notes,declaration,submitted_at,eligibility_reason)
    values (id,c.id,student.name,'student-'||lower(id)||'@example.invalid',btrim(form.location),btrim(form.education),
      academic,subjects,skills,btrim(form.motivation),btrim(form.statement),coalesce(btrim(form.projects),''),
      coalesce(btrim(form.extracurricular),''),coalesce(btrim(form.notes),''),true,now(),'Application received. Screening has not started.');
    update public.cycles set revision=revision+1 where cycles.id=c.id;
    insert into public.audit(actor,action,entity,detail)
      values(student.id,'Application submitted',id,jsonb_build_object('channel','Student portal','cycle_id',c.id));
  end if;

  update public.student_applications set data=jsonb_build_object(
    'location',coalesce(btrim(form.location),''),'education',coalesce(btrim(form.education),''),'academic',coalesce(form.academic,''),
    'subjects',coalesce(btrim(form.subjects),''),'skills',coalesce(btrim(form.skills),''),'motivation',coalesce(btrim(form.motivation),''),
    'statement',coalesce(btrim(form.statement),''),'projects',coalesce(btrim(form.projects),''),
    'extracurricular',coalesce(btrim(form.extracurricular),''),'notes',coalesce(btrim(form.notes),''),'declaration',coalesce(form.declaration,false)
  ), application_id=id, version=version+1, updated_at=now() where owner_id=student.id returning * into draft;
  return draft;
end $$;

create function public.student_portal_state() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare state jsonb;
begin
  if public.current_role() is distinct from 'student' then raise exception 'Student access is required.'; end if;
  select jsonb_build_object(
    'cycle',c.name, 'accepting',c.intake_open and not c.locked, 'id',a.id,
    'submitted_at',a.submitted_at, 'eligibility',a.eligibility,
    'completed_reviews',case when a.eligibility='eligible' then (
      select count(*) from public.reviews r where r.application_id=a.id and r.rubric_version=c.rubric_version and r.status='submitted'
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

create function public.update_intake(p_open boolean, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if public.current_role() is distinct from 'admin' then raise exception 'Administrator access is required.'; end if;
  if p_open is null or char_length(btrim(coalesce(p_reason,''))) not between 8 and 1500 then
    raise exception 'Provide a reason for changing application intake.';
  end if;
  update public.cycles set intake_open=p_open,revision=revision+1 where id=1 and intake_open is distinct from p_open;
  if found then
    insert into public.audit(actor,action,entity,detail) values(
      auth.uid(),case when p_open then 'Intake opened' else 'Intake paused' end,'1',jsonb_build_object('reason',btrim(p_reason))
    );
  end if;
end $$;

revoke execute on function public.save_student_application(integer,jsonb,boolean), public.student_portal_state(),
  public.update_intake(boolean,text) from public, anon;
grant execute on function public.save_student_application(integer,jsonb,boolean), public.student_portal_state(),
  public.update_intake(boolean,text) to authenticated;
