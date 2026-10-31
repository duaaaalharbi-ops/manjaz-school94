create table if not exists public.school_closure_posts (
  id uuid primary key default gen_random_uuid(),
  publish_date date not null,
  weekday text not null check (weekday = any (array['الأحد','الإثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'])),
  grade text not null check (grade = any (array['أولى ثانوي','ثاني ثانوي','ثالث ثانوي'])),
  period smallint not null check (period between 1 and 7),
  teacher_name text not null check (char_length(trim(teacher_name)) between 2 and 160),
  specialization text not null check (char_length(trim(specialization)) between 1 and 120),
  lesson_link text not null default '' check (char_length(lesson_link) <= 1200),
  created_at timestamptz not null default now()
);

alter table public.school_closure_posts enable row level security;

grant select, insert on table public.school_closure_posts to anon, authenticated;
grant update, delete on table public.school_closure_posts to authenticated;
grant all on table public.school_closure_posts to service_role;

create policy school_closure_posts_public_read
  on public.school_closure_posts for select
  to anon, authenticated using (true);

create policy school_closure_posts_public_insert
  on public.school_closure_posts for insert
  to anon, authenticated with check (true);

create policy school_closure_posts_admin_update
  on public.school_closure_posts for update
  to authenticated
  using (auth.uid() is not null and lower(coalesce(auth.jwt() ->> 'email', '')) = 'munjz.s94@hotmail.com')
  with check (auth.uid() is not null and lower(coalesce(auth.jwt() ->> 'email', '')) = 'munjz.s94@hotmail.com');

create policy school_closure_posts_admin_delete
  on public.school_closure_posts for delete
  to authenticated
  using (auth.uid() is not null and lower(coalesce(auth.jwt() ->> 'email', '')) = 'munjz.s94@hotmail.com');
