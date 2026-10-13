-- =====================================================================
-- Ebb: Supabase database setup
-- Run this ONCE in Supabase → SQL Editor → New query → paste → Run.
--
-- Two tables:
--   budgets    – one row per user: their regular bills + savings buffer
--   check_ins  – one row every time the user logs income + an expense
--                and Ebb calculates their safe-to-spend
--
-- Privacy by design:
--   * Only the numbers the calculation needs. No names, no bank details.
--   * Row Level Security (RLS): each user can only see/change THEIR rows.
--   * Rows are deleted automatically if the user's account is deleted.
-- =====================================================================

-- ── Table 1: budgets ──────────────────────────────────────────────────
create table if not exists public.budgets (
  user_id        uuid primary key default auth.uid()
                   references auth.users (id) on delete cascade,
  rent           numeric(12,2) not null check (rent >= 0),
  phone          numeric(12,2) not null check (phone >= 0),
  other_bills    numeric(12,2) not null check (other_bills >= 0),
  savings_buffer numeric(12,2) not null check (savings_buffer >= 0),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- Keep updated_at fresh whenever the bills change
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists budgets_set_updated_at on public.budgets;
create trigger budgets_set_updated_at
  before update on public.budgets
  for each row execute function public.set_updated_at();

-- ── Table 2: check_ins ────────────────────────────────────────────────
create table if not exists public.check_ins (
  id               bigint generated always as identity primary key,
  user_id          uuid not null default auth.uid()
                     references auth.users (id) on delete cascade,
  -- what the user entered
  income_amount    numeric(12,2) not null check (income_amount > 0),
  income_source    text not null check (char_length(income_source) between 1 and 80),
  income_date      date not null,
  expense_amount   numeric(12,2) not null check (expense_amount > 0),
  expense_category text not null check (expense_category in
                     ('Groceries', 'Transport', 'Eating out', 'Bills', 'Other')),
  expense_date     date not null,
  -- snapshot of the bills used for this calculation
  rent             numeric(12,2) not null,
  phone            numeric(12,2) not null,
  other_bills      numeric(12,2) not null,
  savings_buffer   numeric(12,2) not null,
  -- what the Python backend calculated
  safe_before      numeric(12,2) not null,
  safe_to_spend    numeric(12,2) not null,
  outcome          text not null check (outcome in ('success', 'declined')),
  created_at       timestamptz not null default now()
);

create index if not exists check_ins_user_created_idx
  on public.check_ins (user_id, created_at desc);

-- ── Row Level Security ────────────────────────────────────────────────
alter table public.budgets   enable row level security;
alter table public.check_ins enable row level security;

-- budgets: a logged-in user can read/insert/update/delete only their own row
drop policy if exists "budgets: owner can read"   on public.budgets;
drop policy if exists "budgets: owner can insert" on public.budgets;
drop policy if exists "budgets: owner can update" on public.budgets;
drop policy if exists "budgets: owner can delete" on public.budgets;

create policy "budgets: owner can read"   on public.budgets
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "budgets: owner can insert" on public.budgets
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "budgets: owner can update" on public.budgets
  for update to authenticated using ((select auth.uid()) = user_id)
                              with check ((select auth.uid()) = user_id);
create policy "budgets: owner can delete" on public.budgets
  for delete to authenticated using ((select auth.uid()) = user_id);

-- check_ins: same rules (no update policy, history can't be edited)
drop policy if exists "check_ins: owner can read"   on public.check_ins;
drop policy if exists "check_ins: owner can insert" on public.check_ins;
drop policy if exists "check_ins: owner can delete" on public.check_ins;

create policy "check_ins: owner can read"   on public.check_ins
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "check_ins: owner can insert" on public.check_ins
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "check_ins: owner can delete" on public.check_ins
  for delete to authenticated using ((select auth.uid()) = user_id);

-- ── Permissions ───────────────────────────────────────────────────────
-- Logged-out visitors (the "anon" role) get nothing at all.
revoke all on public.budgets   from anon;
revoke all on public.check_ins from anon;
grant select, insert, update, delete on public.budgets   to authenticated;
grant select, insert, delete         on public.check_ins to authenticated;
