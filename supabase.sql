-- مخطط قاعدة بيانات مقترح للمرحلة التالية
create table if not exists achievements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null,
  execution_date date not null,
  entity text not null,
  team text not null,
  audience text not null,
  beneficiaries integer,
  achievement_type text not null,
  goal text not null,
  description text not null,
  impact text not null,
  external_link text,
  status text not null default 'تحت المراجعة',
  created_at timestamptz not null default now()
);

create table if not exists evidence_files (
  id uuid primary key default gen_random_uuid(),
  achievement_id uuid not null references achievements(id) on delete cascade,
  file_url text not null,
  file_name text not null,
  file_type text,
  created_at timestamptz not null default now()
);

-- المرحلة الفعلية القادمة:
-- 1) تفعيل Supabase Auth
-- 2) إنشاء Storage bucket باسم evidence
-- 3) إضافة Row Level Security policies للمعلمات والإدارة
