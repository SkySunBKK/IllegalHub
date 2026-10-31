-- Run this entire file in Supabase SQL Editor.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  role text not null default 'moderator' check (role in ('owner','senior_mod','moderator')),
  created_at timestamptz not null default now()
);
create table if not exists public.articles (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  summary text,
  body text not null,
  kind text not null check (kind in ('rule','case','punishment','training')),
  category text,
  published boolean not null default false,
  sort_order integer not null default 0,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create or replace function public.current_user_role()
returns text language sql stable security definer set search_path = public
as $$ select role from public.profiles where id = auth.uid() $$;
alter table public.profiles enable row level security;
alter table public.articles enable row level security;
create policy "users read own profile" on public.profiles for select to authenticated using (id = auth.uid());
create policy "admins read all profiles" on public.profiles for select to authenticated using (public.current_user_role() in ('owner','senior_mod'));
create policy "public read published articles" on public.articles for select to anon, authenticated using (published = true);
create policy "admins read all articles" on public.articles for select to authenticated using (public.current_user_role() in ('owner','senior_mod'));
create policy "admins insert articles" on public.articles for insert to authenticated with check (public.current_user_role() in ('owner','senior_mod') and created_by = auth.uid());
create policy "admins update articles" on public.articles for update to authenticated using (public.current_user_role() in ('owner','senior_mod')) with check (public.current_user_role() in ('owner','senior_mod'));
create policy "owner delete articles" on public.articles for delete to authenticated using (public.current_user_role() = 'owner');
-- Create auth users in Supabase Authentication first, then assign roles:
-- update public.profiles set role='owner' where email='YOUR_EMAIL';
-- update public.profiles set role='senior_mod' where email='SENIOR_MOD_EMAIL';
-- A profile row can be created manually after signup:
-- insert into public.profiles(id,email,role)
-- select id,email,'moderator' from auth.users where email='YOUR_EMAIL';
