-- ==========================================================
--  دفتري: إعداد قاعدة البيانات على Supabase
--  الصقه كاملًا في: Supabase > SQL Editor > New query ثم Run
--  (آمن للتشغيل أكثر من مرة)
-- ==========================================================
create extension if not exists "pgcrypto";

-- الملف الشخصي
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

-- أسماء المستخدمين (الدخول باسم المستخدم). يصل لها الخادم فقط (Service Role)
create table if not exists usernames (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text not null,
  username_lower text not null unique,
  login_email text not null,
  created_at timestamptz not null default now()
);
alter table usernames enable row level security;

-- الملاحظات
create table if not exists notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text,
  content text not null default '',
  color text not null default 'none',
  tags text[] not null default '{}',
  pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- المواعيد
create table if not exists appointments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  location text,
  details text,
  appt_date date not null,
  appt_time time,
  created_at timestamptz not null default now()
);

-- المهام
create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  priority text not null default 'medium' check (priority in ('high','medium','low')),
  due_date date,
  done boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notes_user_idx on notes(user_id, updated_at desc);
create index if not exists appts_user_idx on appointments(user_id, appt_date);
create index if not exists tasks_user_idx on tasks(user_id, done, due_date);

-- ---------- الأمان: كل مستخدم يرى بياناته فقط ----------
alter table profiles enable row level security;
alter table notes enable row level security;
alter table appointments enable row level security;
alter table tasks enable row level security;

drop policy if exists "profiles_select_own" on profiles;
drop policy if exists "profiles_update_own" on profiles;
create policy "profiles_select_own" on profiles for select using (auth.uid() = id);
create policy "profiles_update_own" on profiles for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "notes_own" on notes;
create policy "notes_own" on notes for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "appts_own" on appointments;
create policy "appts_own" on appointments for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "tasks_own" on tasks;
create policy "tasks_own" on tasks for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- إنشاء الملف الشخصي تلقائيًا عند التسجيل
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', 'مستخدم جديد'));
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
