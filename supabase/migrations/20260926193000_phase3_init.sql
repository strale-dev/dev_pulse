-- Phase 3 init (DB.md Â§4â€“Â§6). github_credentials skipped â€” created in Phase 2.
create extension if not exists citext;

--> statement-breakpoint
CREATE TABLE "profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"github_login" citext,
	"display_name" text,
	"bio" text,
	"avatar_url" text,
	"timezone" text,
	"is_public" boolean DEFAULT true NOT NULL,
	"onboarding_completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profiles_github_login_unique" UNIQUE("github_login")
);
--> statement-breakpoint
CREATE TABLE "github_profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"github_user_id" bigint NOT NULL,
	"login" citext NOT NULL,
	"name" text,
	"bio" text,
	"avatar_url" text,
	"company" text,
	"location" text,
	"blog" text,
	"twitter_username" text,
	"public_repos" integer,
	"followers" integer,
	"following" integer,
	"github_created_at" timestamp with time zone,
	"fetched_at" timestamp with time zone NOT NULL,
	"stale_after" timestamp with time zone NOT NULL,
	"raw" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "github_profiles_github_user_id_unique" UNIQUE("github_user_id")
);
--> statement-breakpoint
CREATE TABLE "repositories" (
	"id" bigint PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"owner_login" citext NOT NULL,
	"name" text NOT NULL,
	"full_name" citext NOT NULL,
	"description" text,
	"html_url" text NOT NULL,
	"homepage" text,
	"is_fork" boolean DEFAULT false NOT NULL,
	"is_archived" boolean DEFAULT false NOT NULL,
	"is_private" boolean DEFAULT false NOT NULL,
	"primary_language" text,
	"stargazers_count" integer DEFAULT 0 NOT NULL,
	"forks_count" integer DEFAULT 0 NOT NULL,
	"open_issues_count" integer DEFAULT 0 NOT NULL,
	"default_branch" text,
	"pushed_at" timestamp with time zone,
	"github_created_at" timestamp with time zone,
	"github_updated_at" timestamp with time zone,
	"fetched_at" timestamp with time zone NOT NULL,
	"stale_after" timestamp with time zone NOT NULL,
	"raw" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "repositories_user_id_full_name_unique" UNIQUE("user_id","full_name")
);
--> statement-breakpoint
CREATE TABLE "repository_languages" (
	"repository_id" bigint NOT NULL,
	"user_id" uuid NOT NULL,
	"language" text NOT NULL,
	"bytes" bigint NOT NULL,
	"fetched_at" timestamp with time zone NOT NULL,
	CONSTRAINT "repository_languages_repository_id_language_pk" PRIMARY KEY("repository_id","language")
);
--> statement-breakpoint
CREATE TABLE "contribution_days" (
	"user_id" uuid NOT NULL,
	"day" date NOT NULL,
	"contributions" integer DEFAULT 0 NOT NULL,
	"level" smallint DEFAULT 0 NOT NULL,
	"fetched_at" timestamp with time zone NOT NULL,
	CONSTRAINT "contribution_days_user_id_day_pk" PRIMARY KEY("user_id","day")
);
--> statement-breakpoint
CREATE TABLE "activity_events" (
	"user_id" uuid NOT NULL,
	"day" date NOT NULL,
	"commits" integer DEFAULT 0 NOT NULL,
	"pull_requests" integer DEFAULT 0 NOT NULL,
	"issues" integer DEFAULT 0 NOT NULL,
	"code_reviews" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "activity_events_user_id_day_pk" PRIMARY KEY("user_id","day")
);
--> statement-breakpoint
CREATE TABLE "analytics_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"window_days" integer DEFAULT 365 NOT NULL,
	"snapshot_hash" text NOT NULL,
	"payload" jsonb NOT NULL,
	"total_commits" integer NOT NULL,
	"total_prs" integer NOT NULL,
	"total_issues" integer NOT NULL,
	"total_repos" integer NOT NULL,
	"longest_streak" integer NOT NULL,
	"current_streak" integer NOT NULL,
	"most_active_day" text,
	"most_active_hour_utc" smallint,
	"top_language" text,
	"top_repository_id" bigint,
	"activity_trend" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "analytics_snapshots_activity_trend_check" CHECK (activity_trend is null or activity_trend in ('up', 'down', 'flat'))
);
--> statement-breakpoint
CREATE TABLE "ai_insights" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"snapshot_id" uuid NOT NULL,
	"snapshot_hash" text NOT NULL,
	"model" text NOT NULL,
	"development_style" text NOT NULL,
	"technology" text NOT NULL,
	"consistency" text NOT NULL,
	"recommendations" jsonb NOT NULL,
	"tokens_used" integer,
	"latency_ms" integer,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sync_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"status" text NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"steps" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"github_rate_remaining" integer,
	"error_message" text,
	CONSTRAINT "sync_runs_kind_check" CHECK (kind in ('full', 'partial', 'manual')),
	CONSTRAINT "sync_runs_status_check" CHECK (status in ('running', 'success', 'failed', 'partial'))
);
--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "github_profiles" ADD CONSTRAINT "github_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "repositories" ADD CONSTRAINT "repositories_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "repository_languages" ADD CONSTRAINT "repository_languages_repository_id_repositories_id_fk" FOREIGN KEY ("repository_id") REFERENCES "public"."repositories"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "repository_languages" ADD CONSTRAINT "repository_languages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "contribution_days" ADD CONSTRAINT "contribution_days_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "activity_events" ADD CONSTRAINT "activity_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "analytics_snapshots" ADD CONSTRAINT "analytics_snapshots_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ai_insights" ADD CONSTRAINT "ai_insights_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ai_insights" ADD CONSTRAINT "ai_insights_snapshot_id_analytics_snapshots_id_fk" FOREIGN KEY ("snapshot_id") REFERENCES "public"."analytics_snapshots"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "sync_runs" ADD CONSTRAINT "sync_runs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "idx_profiles_github_login" ON "profiles" USING btree ("github_login");
--> statement-breakpoint
CREATE INDEX "idx_repositories_user_id" ON "repositories" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX "idx_repositories_user_pushed" ON "repositories" USING btree ("user_id","pushed_at" DESC NULLS LAST);
--> statement-breakpoint
CREATE INDEX "idx_repositories_user_stars" ON "repositories" USING btree ("user_id","stargazers_count" DESC NULLS LAST);
--> statement-breakpoint
CREATE INDEX "idx_repo_languages_user" ON "repository_languages" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX "idx_contrib_days_user_day" ON "contribution_days" USING btree ("user_id","day" DESC NULLS LAST);
--> statement-breakpoint
CREATE INDEX "idx_activity_user_day" ON "activity_events" USING btree ("user_id","day" DESC NULLS LAST);
--> statement-breakpoint
CREATE INDEX "idx_snapshots_user_created" ON "analytics_snapshots" USING btree ("user_id","created_at" DESC NULLS LAST);
--> statement-breakpoint
CREATE INDEX "idx_snapshots_hash" ON "analytics_snapshots" USING btree ("user_id","snapshot_hash");
--> statement-breakpoint
CREATE UNIQUE INDEX "ai_insights_user_id_snapshot_hash_unique" ON "ai_insights" USING btree ("user_id","snapshot_hash");
--> statement-breakpoint
CREATE INDEX "idx_ai_insights_user_hash_fresh" ON "ai_insights" USING btree ("user_id","snapshot_hash","expires_at" DESC NULLS LAST);
--> statement-breakpoint
CREATE INDEX "idx_sync_runs_user_started" ON "sync_runs" USING btree ("user_id","started_at" DESC NULLS LAST);

-- RLS, grants, triggers: see 20260926193100_phase3_init_rls_triggers.sql (applied as separate MCP migration)
