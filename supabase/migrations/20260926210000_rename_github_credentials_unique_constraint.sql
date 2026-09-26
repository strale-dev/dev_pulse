-- Align constraint name with Drizzle schema (github_credentials_github_user_id_unique).
ALTER TABLE public.github_credentials
  RENAME CONSTRAINT github_credentials_github_user_id_key
  TO github_credentials_github_user_id_unique;
