ALTER TABLE "sync_runs" ADD COLUMN IF NOT EXISTS "github_rate_reset" timestamptz;
