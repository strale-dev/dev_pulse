-- Mirror of migration applied via Supabase MCP (Phase 4)
create or replace function public.get_github_provider_token(
  p_user_id uuid,
  p_encryption_key text
)
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_encrypted bytea;
  v_token text;
begin
  if p_encryption_key is null or length(p_encryption_key) = 0 then
    raise exception 'encryption key required';
  end if;

  select provider_token_encrypted
  into v_encrypted
  from public.github_credentials
  where user_id = p_user_id;

  if v_encrypted is null then
    raise exception 'github credential not found for user';
  end if;

  v_token := extensions.pgp_sym_decrypt(v_encrypted, p_encryption_key);
  return v_token;
end;
$$;

revoke all on function public.get_github_provider_token(uuid, text) from public, anon, authenticated;
grant execute on function public.get_github_provider_token(uuid, text) to service_role;
