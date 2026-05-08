CREATE TABLE IF NOT EXISTS "spray_lab_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"base_analysis_session_id" uuid NOT NULL,
	"protocol_revision_id" uuid,
	"protocol_id" text NOT NULL,
	"lane_id" text NOT NULL,
	"context_key" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"act" text DEFAULT 'preparar' NOT NULL,
	"step_state" text DEFAULT 'preparar' NOT NULL,
	"evidence_level" text DEFAULT 'practice' NOT NULL,
	"fidelity_tier" text,
	"validation_status" text DEFAULT 'not_requested' NOT NULL,
	"snapshot" jsonb NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "spray_lab_session_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"lab_session_id" uuid NOT NULL,
	"event_id" text NOT NULL,
	"event_type" text NOT NULL,
	"act" text NOT NULL,
	"step_state" text NOT NULL,
	"occurred_at" timestamp NOT NULL,
	"payload" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "spray_lab_benchmark_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"lab_session_id" uuid NOT NULL,
	"base_analysis_session_id" uuid NOT NULL,
	"protocol_revision_id" uuid,
	"protocol_id" text NOT NULL,
	"lane_id" text NOT NULL,
	"context_key" text NOT NULL,
	"evidence_level" text NOT NULL,
	"fidelity_tier" text NOT NULL,
	"validation_status" text NOT NULL,
	"eligible_for_release_benchmark" boolean DEFAULT false NOT NULL,
	"snapshot" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "spray_lab_validation_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"lab_session_id" uuid NOT NULL,
	"base_analysis_session_id" uuid NOT NULL,
	"validation_analysis_session_id" uuid,
	"context_key" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"confirmed_variables" boolean DEFAULT false NOT NULL,
	"payload" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'spray_lab_sessions_user_id_users_id_fk') THEN
		ALTER TABLE "spray_lab_sessions" ADD CONSTRAINT "spray_lab_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
	END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'spray_lab_sessions_base_analysis_session_id_analysis_sessions_id_fk') THEN
		ALTER TABLE "spray_lab_sessions" ADD CONSTRAINT "spray_lab_sessions_base_analysis_session_id_analysis_sessions_id_fk" FOREIGN KEY ("base_analysis_session_id") REFERENCES "public"."analysis_sessions"("id") ON DELETE cascade ON UPDATE no action;
	END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'spray_lab_sessions_protocol_revision_id_complete_training_protocol_revisions_id_fk') THEN
		ALTER TABLE "spray_lab_sessions" ADD CONSTRAINT "spray_lab_sessions_protocol_revision_id_complete_training_protocol_revisions_id_fk" FOREIGN KEY ("protocol_revision_id") REFERENCES "public"."complete_training_protocol_revisions"("id") ON DELETE set null ON UPDATE no action;
	END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'spray_lab_session_events_user_id_users_id_fk') THEN
		ALTER TABLE "spray_lab_session_events" ADD CONSTRAINT "spray_lab_session_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
	END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'spray_lab_session_events_lab_session_id_spray_lab_sessions_id_fk') THEN
		ALTER TABLE "spray_lab_session_events" ADD CONSTRAINT "spray_lab_session_events_lab_session_id_spray_lab_sessions_id_fk" FOREIGN KEY ("lab_session_id") REFERENCES "public"."spray_lab_sessions"("id") ON DELETE cascade ON UPDATE no action;
	END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'spray_lab_benchmark_snapshots_user_id_users_id_fk') THEN
		ALTER TABLE "spray_lab_benchmark_snapshots" ADD CONSTRAINT "spray_lab_benchmark_snapshots_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
	END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'spray_lab_benchmark_snapshots_lab_session_id_spray_lab_sessions_id_fk') THEN
		ALTER TABLE "spray_lab_benchmark_snapshots" ADD CONSTRAINT "spray_lab_benchmark_snapshots_lab_session_id_spray_lab_sessions_id_fk" FOREIGN KEY ("lab_session_id") REFERENCES "public"."spray_lab_sessions"("id") ON DELETE cascade ON UPDATE no action;
	END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'spray_lab_benchmark_snapshots_base_analysis_session_id_analysis_sessions_id_fk') THEN
		ALTER TABLE "spray_lab_benchmark_snapshots" ADD CONSTRAINT "spray_lab_benchmark_snapshots_base_analysis_session_id_analysis_sessions_id_fk" FOREIGN KEY ("base_analysis_session_id") REFERENCES "public"."analysis_sessions"("id") ON DELETE cascade ON UPDATE no action;
	END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'spray_lab_benchmark_snapshots_protocol_revision_id_complete_training_protocol_revisions_id_fk') THEN
		ALTER TABLE "spray_lab_benchmark_snapshots" ADD CONSTRAINT "spray_lab_benchmark_snapshots_protocol_revision_id_complete_training_protocol_revisions_id_fk" FOREIGN KEY ("protocol_revision_id") REFERENCES "public"."complete_training_protocol_revisions"("id") ON DELETE set null ON UPDATE no action;
	END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'spray_lab_validation_links_user_id_users_id_fk') THEN
		ALTER TABLE "spray_lab_validation_links" ADD CONSTRAINT "spray_lab_validation_links_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
	END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'spray_lab_validation_links_lab_session_id_spray_lab_sessions_id_fk') THEN
		ALTER TABLE "spray_lab_validation_links" ADD CONSTRAINT "spray_lab_validation_links_lab_session_id_spray_lab_sessions_id_fk" FOREIGN KEY ("lab_session_id") REFERENCES "public"."spray_lab_sessions"("id") ON DELETE cascade ON UPDATE no action;
	END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'spray_lab_validation_links_base_analysis_session_id_analysis_sessions_id_fk') THEN
		ALTER TABLE "spray_lab_validation_links" ADD CONSTRAINT "spray_lab_validation_links_base_analysis_session_id_analysis_sessions_id_fk" FOREIGN KEY ("base_analysis_session_id") REFERENCES "public"."analysis_sessions"("id") ON DELETE cascade ON UPDATE no action;
	END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'spray_lab_validation_links_validation_analysis_session_id_analysis_sessions_id_fk') THEN
		ALTER TABLE "spray_lab_validation_links" ADD CONSTRAINT "spray_lab_validation_links_validation_analysis_session_id_analysis_sessions_id_fk" FOREIGN KEY ("validation_analysis_session_id") REFERENCES "public"."analysis_sessions"("id") ON DELETE set null ON UPDATE no action;
	END IF;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "spray_lab_sessions_user_status_updated_idx" ON "spray_lab_sessions" USING btree ("user_id","status","updated_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "spray_lab_sessions_base_analysis_idx" ON "spray_lab_sessions" USING btree ("base_analysis_session_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "spray_lab_sessions_user_base_idx" ON "spray_lab_sessions" USING btree ("user_id","base_analysis_session_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "spray_lab_sessions_context_status_idx" ON "spray_lab_sessions" USING btree ("context_key","status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "spray_lab_sessions_protocol_revision_idx" ON "spray_lab_sessions" USING btree ("protocol_revision_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "spray_lab_session_events_session_event_uidx" ON "spray_lab_session_events" USING btree ("lab_session_id","event_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "spray_lab_session_events_user_created_idx" ON "spray_lab_session_events" USING btree ("user_id","created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "spray_lab_session_events_session_created_idx" ON "spray_lab_session_events" USING btree ("lab_session_id","created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "spray_lab_benchmark_snapshots_user_context_idx" ON "spray_lab_benchmark_snapshots" USING btree ("user_id","context_key");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "spray_lab_benchmark_snapshots_session_created_idx" ON "spray_lab_benchmark_snapshots" USING btree ("lab_session_id","created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "spray_lab_benchmark_snapshots_base_analysis_idx" ON "spray_lab_benchmark_snapshots" USING btree ("base_analysis_session_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "spray_lab_benchmark_snapshots_release_idx" ON "spray_lab_benchmark_snapshots" USING btree ("eligible_for_release_benchmark","created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "spray_lab_validation_links_user_status_idx" ON "spray_lab_validation_links" USING btree ("user_id","status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "spray_lab_validation_links_lab_session_idx" ON "spray_lab_validation_links" USING btree ("lab_session_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "spray_lab_validation_links_base_analysis_idx" ON "spray_lab_validation_links" USING btree ("base_analysis_session_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "spray_lab_validation_links_validation_analysis_idx" ON "spray_lab_validation_links" USING btree ("validation_analysis_session_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "spray_lab_validation_links_context_status_idx" ON "spray_lab_validation_links" USING btree ("context_key","status");
