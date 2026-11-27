-- Apply once after the project's existing admin schema.
begin;
create table if not exists public.bank_editions (
 subject_id text not null, version integer not null, path text not null,
 name text not null, subtitle text, saved_at timestamptz not null default now(),
 primary key(subject_id,version,path)
);
alter table public.bank_editions enable row level security;
drop policy if exists "admin reads prior editions" on public.bank_editions;
create policy "admin reads prior editions" on public.bank_editions for select to authenticated using(public.is_admin());
grant select on public.bank_editions to authenticated;
create or replace function public.remember_bank_edition() returns trigger
language plpgsql security definer set search_path=public as $$
begin
 if old.path is not null and old.path is distinct from new.path then
  insert into public.bank_editions(subject_id,version,path,name,subtitle)
  values(old.id,old.version,old.path,old.name,old.subtitle) on conflict do nothing;
 end if;
 return new;
end $$;
drop trigger if exists remember_bank_edition on public.subjects;
create trigger remember_bank_edition before update of path on public.subjects
for each row execute function public.remember_bank_edition();
create or replace function public.bank_attempt_impact(subject_key text, changed_ids text[])
returns integer language plpgsql stable security definer set search_path=public as $$
declare n integer;
begin
 if not public.is_admin() then raise exception 'Admin access required'; end if;
 select count(distinct attempted.id) into n
 from public.user_data u cross join lateral jsonb_object_keys(
 case when jsonb_typeof(u.v::jsonb)='object' then u.v::jsonb else '{}'::jsonb end
 ) attempted(id) where u.k='qs:'||subject_key and attempted.id=any(changed_ids);
 return n;
end $$;
revoke all on function public.bank_attempt_impact(text,text[]) from public;
grant execute on function public.bank_attempt_impact(text,text[]) to authenticated;
commit;
