-- Mirror of migration applied via Supabase MCP (Phase 2)
create extension if not exists pgcrypto with schema extensions;

create table if not exists public.github_credentials (
  user_id uuid primary key references auth.users (id) on delete cascade,
  provider_token_encrypted bytea not null,
  scopes text[] not null,
  token_type text,
  github_user_id bigint unique,
  rotated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.github_credentials enable row level security;

revoke all on public.github_credentials from anon, authenticated;

grant all on public.github_credentials to service_role;

create or replace function public.store_github_credential(
  p_user_id uuid,
  p_token text,
  p_encryption_key text,
  p_scopes text[],
  p_github_user_id bigint,
  p_token_type text default 'bearer'
)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if p_encryption_key is null or length(p_encryption_key) = 0 then
    raise exception 'encryption key required';
  end if;

  insert into public.github_credentials (
    user_id,
    provider_token_encrypted,
    scopes,
    token_type,
    github_user_id,
    rotated_at,
    updated_at
  )
  values (
    p_user_id,
    extensions.pgp_sym_encrypt(p_token, p_encryption_key),
    p_scopes,
    p_token_type,
    p_github_user_id,
    now(),
    now()
  )
  on conflict (user_id) do update set
    provider_token_encrypted = extensions.pgp_sym_encrypt(p_token, p_encryption_key),
    scopes = excluded.scopes,
    token_type = excluded.token_type,
    github_user_id = excluded.github_user_id,
    rotated_at = now(),
    updated_at = now();
end;
$$;

revoke all on function public.store_github_credential(uuid, text, text, text[], bigint, text) from public, anon, authenticated;
grant execute on function public.store_github_credential(uuid, text, text, text[], bigint, text) to service_role;
