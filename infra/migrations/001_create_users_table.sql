-- BookHaven Phase 1 Migration: 001_create_users_table.sql
-- Purpose: Persistent user accounts & credentials for custom Node/Express JWT authentication.
-- Safe & Idempotent: Does not drop or overwrite any existing tables or production data.

-- 1. Ensure cryptographic UUID generation is available
create extension if not exists pgcrypto;

-- 2. Create users table for persistent credentials and authorization roles
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  password_hash text not null,
  display_name text not null,
  role text not null default 'customer' check (role in ('customer', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3. Case-insensitive unique index on email
create unique index if not exists users_email_lower_idx on public.users (lower(email));

-- 4. Automatically maintain updated_at timestamp on row modification
create or replace function public.set_users_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists tr_users_updated_at on public.users;
create trigger tr_users_updated_at
  before update on public.users
  for each row execute function public.set_users_updated_at();

-- 5. Row Level Security (RLS)
-- Protect user credentials and password hashes from direct anonymous PostgREST access.
alter table public.users enable row level security;

-- Only privileged backend services using SUPABASE_SERVICE_ROLE_KEY bypass RLS.
-- No public SELECT / INSERT / UPDATE / DELETE policies are granted to the 'anon' role,
-- preventing any exposure of password_hash through the Supabase public API.
