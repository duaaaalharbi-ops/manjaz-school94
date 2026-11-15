create table if not exists public.class_attendance_schedules (
  id uuid primary key default gen_random_uuid(),
  day_date date not null unique,
  rows jsonb not null default '[]'::jsonb check (jsonb_typeof(rows) = 'array'),
  published boolean not null default false,
  status text not null default 'مسودة' check (status in ('مسودة','معتمد')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

with source_rows as (
  select id, data, status, created_at, updated_at, data->>'date' as date_text
  from public.records
  where kind = 'class_attendance_schedule'
),
normalized as (
  select id, data, status, created_at, updated_at, date_text,
         to_date(date_text, 'YYYY-MM-DD') as day_date
  from source_rows
  where date_text ~ '^\\d{4}-\\d{2}-\\d{2}$'
    and substring(date_text,1,4)::integer between 1 and 9999
    and substring(date_text,6,2)::integer between 1 and 12
    and substring(date_text,9,2)::integer between 1 and 31
),
valid_rows as (
  select * from normalized
  where to_char(day_date, 'YYYY-MM-DD') = date_text
),
latest_per_day as (
  select distinct on (day_date) *
  from valid_rows
  order by day_date, id desc
)
insert into public.class_attendance_schedules
  (day_date, rows, published, status, created_at, updated_at)
select
  day_date,
  case when jsonb_typeof(data->'rows') = 'array' then data->'rows' else '[]'::jsonb end,
  (data->>'published' = 'true' or status in ('منشور','معتمد')),
  case when data->>'published' = 'true' or status in ('منشور','معتمد') then 'معتمد' else 'مسودة' end,
  coalesce(created_at, now()),
  coalesce(updated_at, created_at, now())
from latest_per_day
on conflict (day_date) do nothing;

alter table public.class_attendance_schedules enable row level security;
revoke all on table public.class_attendance_schedules from anon, authenticated;
grant select, insert, update, delete on table public.class_attendance_schedules to anon, authenticated;
grant all on table public.class_attendance_schedules to service_role;

drop policy if exists class_attendance_schedules_read on public.class_attendance_schedules;
create policy class_attendance_schedules_read
on public.class_attendance_schedules
for select to anon, authenticated
using (true);

drop policy if exists class_attendance_schedules_draft_insert on public.class_attendance_schedules;
create policy class_attendance_schedules_draft_insert
on public.class_attendance_schedules
for insert to anon, authenticated
with check (status = 'مسودة' and published = false);

drop policy if exists class_attendance_schedules_admin_insert on public.class_attendance_schedules;
create policy class_attendance_schedules_admin_insert
on public.class_attendance_schedules
for insert to authenticated
with check (
  (select auth.uid()) is not null
  and lower(coalesce((select auth.jwt()->>'email'),'')) = 'munjz.s94@hotmail.com'
);

drop policy if exists class_attendance_schedules_draft_update on public.class_attendance_schedules;
create policy class_attendance_schedules_draft_update
on public.class_attendance_schedules
for update to anon, authenticated
using (status = 'مسودة' and published = false)
with check (status = 'مسودة' and published = false);

drop policy if exists class_attendance_schedules_admin_update on public.class_attendance_schedules;
create policy class_attendance_schedules_admin_update
on public.class_attendance_schedules
for update to authenticated
using (
  (select auth.uid()) is not null
  and lower(coalesce((select auth.jwt()->>'email'),'')) = 'munjz.s94@hotmail.com'
)
with check (
  (select auth.uid()) is not null
  and lower(coalesce((select auth.jwt()->>'email'),'')) = 'munjz.s94@hotmail.com'
);

drop policy if exists class_attendance_schedules_draft_delete on public.class_attendance_schedules;
create policy class_attendance_schedules_draft_delete
on public.class_attendance_schedules
for delete to anon, authenticated
using (status = 'مسودة' and published = false);

drop policy if exists class_attendance_schedules_admin_delete on public.class_attendance_schedules;
create policy class_attendance_schedules_admin_delete
on public.class_attendance_schedules
for delete to authenticated
using (
  (select auth.uid()) is not null
  and lower(coalesce((select auth.jwt()->>'email'),'')) = 'munjz.s94@hotmail.com'
);
