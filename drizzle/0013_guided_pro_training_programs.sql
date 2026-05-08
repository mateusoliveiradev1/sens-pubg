CREATE TABLE IF NOT EXISTS "training_program_cycles" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"base_analysis_session_id" uuid NOT NULL,
	"protocol_revision_id" uuid,
	"protocol_id" text,
	"active_line_id" text,
	"active_line_context_key" text NOT NULL,
	"strict_context_key" text NOT NULL,
	"kind" text NOT NULL,
	"state" text NOT NULL,
	"current_week_number" integer DEFAULT 1 NOT NULL,
	"current_mission_id" text,
	"recovery_action" text NOT NULL,
	"reason_codes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"visible_reason" text NOT NULL,
	"blocker_summary" text NOT NULL,
	"snapshot" jsonb NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"archived_at" timestamp,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "training_program_weeks" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"cycle_id" text NOT NULL,
	"week_number" integer NOT NULL,
	"state" text NOT NULL,
	"recovery_action" text,
	"reason_codes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"can_increase_difficulty" boolean DEFAULT false NOT NULL,
	"snapshot" jsonb NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"started_at" timestamp,
	"closed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "training_program_missions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"cycle_id" text NOT NULL,
	"week_id" text NOT NULL,
	"week_number" integer NOT NULL,
	"slot" text NOT NULL,
	"category" text NOT NULL,
	"status" text NOT NULL,
	"state_after_completion" text NOT NULL,
	"protocol_revision_id" uuid,
	"protocol_id" text,
	"lab_session_id" uuid,
	"validation_link_id" uuid,
	"reason_codes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"evidence_refs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"visible_reason" text NOT NULL,
	"snapshot" jsonb NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"started_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "training_program_checkpoints" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"cycle_id" text NOT NULL,
	"week_id" text,
	"week_number" integer,
	"layer" text NOT NULL,
	"state" text NOT NULL,
	"outcome" text NOT NULL,
	"next_recommendation" text NOT NULL,
	"can_increase_difficulty" boolean DEFAULT false NOT NULL,
	"lab_session_id" uuid,
	"validation_link_id" uuid,
	"precision_checkpoint_id" uuid,
	"reason_codes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"evidence_snapshot" jsonb NOT NULL,
	"snapshot" jsonb NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"summary" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "training_program_events" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"cycle_id" text NOT NULL,
	"mission_id" text,
	"checkpoint_id" text,
	"event_type" text NOT NULL,
	"from_state" text NOT NULL,
	"to_state" text NOT NULL,
	"reason_codes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"evidence_refs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"user_visible_reason" text NOT NULL,
	"payload" jsonb NOT NULL,
	"occurred_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'training_program_cycles_user_id_users_id_fk') THEN
		ALTER TABLE "training_program_cycles" ADD CONSTRAINT "training_program_cycles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
	END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'training_program_cycles_base_analysis_session_id_analysis_sessions_id_fk') THEN
		ALTER TABLE "training_program_cycles" ADD CONSTRAINT "training_program_cycles_base_analysis_session_id_analysis_sessions_id_fk" FOREIGN KEY ("base_analysis_session_id") REFERENCES "public"."analysis_sessions"("id") ON DELETE cascade ON UPDATE no action;
	END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'training_program_cycles_protocol_revision_id_complete_training_protocol_revisions_id_fk') THEN
		ALTER TABLE "training_program_cycles" ADD CONSTRAINT "training_program_cycles_protocol_revision_id_complete_training_protocol_revisions_id_fk" FOREIGN KEY ("protocol_revision_id") REFERENCES "public"."complete_training_protocol_revisions"("id") ON DELETE set null ON UPDATE no action;
	END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'training_program_weeks_user_id_users_id_fk') THEN
		ALTER TABLE "training_program_weeks" ADD CONSTRAINT "training_program_weeks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
	END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'training_program_weeks_cycle_id_training_program_cycles_id_fk') THEN
		ALTER TABLE "training_program_weeks" ADD CONSTRAINT "training_program_weeks_cycle_id_training_program_cycles_id_fk" FOREIGN KEY ("cycle_id") REFERENCES "public"."training_program_cycles"("id") ON DELETE cascade ON UPDATE no action;
	END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'training_program_missions_user_id_users_id_fk') THEN
		ALTER TABLE "training_program_missions" ADD CONSTRAINT "training_program_missions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
	END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'training_program_missions_cycle_id_training_program_cycles_id_fk') THEN
		ALTER TABLE "training_program_missions" ADD CONSTRAINT "training_program_missions_cycle_id_training_program_cycles_id_fk" FOREIGN KEY ("cycle_id") REFERENCES "public"."training_program_cycles"("id") ON DELETE cascade ON UPDATE no action;
	END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'training_program_missions_week_id_training_program_weeks_id_fk') THEN
		ALTER TABLE "training_program_missions" ADD CONSTRAINT "training_program_missions_week_id_training_program_weeks_id_fk" FOREIGN KEY ("week_id") REFERENCES "public"."training_program_weeks"("id") ON DELETE cascade ON UPDATE no action;
	END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'training_program_missions_protocol_revision_id_complete_training_protocol_revisions_id_fk') THEN
		ALTER TABLE "training_program_missions" ADD CONSTRAINT "training_program_missions_protocol_revision_id_complete_training_protocol_revisions_id_fk" FOREIGN KEY ("protocol_revision_id") REFERENCES "public"."complete_training_protocol_revisions"("id") ON DELETE set null ON UPDATE no action;
	END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'training_program_missions_lab_session_id_spray_lab_sessions_id_fk') THEN
		ALTER TABLE "training_program_missions" ADD CONSTRAINT "training_program_missions_lab_session_id_spray_lab_sessions_id_fk" FOREIGN KEY ("lab_session_id") REFERENCES "public"."spray_lab_sessions"("id") ON DELETE set null ON UPDATE no action;
	END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'training_program_missions_validation_link_id_spray_lab_validation_links_id_fk') THEN
		ALTER TABLE "training_program_missions" ADD CONSTRAINT "training_program_missions_validation_link_id_spray_lab_validation_links_id_fk" FOREIGN KEY ("validation_link_id") REFERENCES "public"."spray_lab_validation_links"("id") ON DELETE set null ON UPDATE no action;
	END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'training_program_checkpoints_user_id_users_id_fk') THEN
		ALTER TABLE "training_program_checkpoints" ADD CONSTRAINT "training_program_checkpoints_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
	END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'training_program_checkpoints_cycle_id_training_program_cycles_id_fk') THEN
		ALTER TABLE "training_program_checkpoints" ADD CONSTRAINT "training_program_checkpoints_cycle_id_training_program_cycles_id_fk" FOREIGN KEY ("cycle_id") REFERENCES "public"."training_program_cycles"("id") ON DELETE cascade ON UPDATE no action;
	END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'training_program_checkpoints_week_id_training_program_weeks_id_fk') THEN
		ALTER TABLE "training_program_checkpoints" ADD CONSTRAINT "training_program_checkpoints_week_id_training_program_weeks_id_fk" FOREIGN KEY ("week_id") REFERENCES "public"."training_program_weeks"("id") ON DELETE set null ON UPDATE no action;
	END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'training_program_checkpoints_lab_session_id_spray_lab_sessions_id_fk') THEN
		ALTER TABLE "training_program_checkpoints" ADD CONSTRAINT "training_program_checkpoints_lab_session_id_spray_lab_sessions_id_fk" FOREIGN KEY ("lab_session_id") REFERENCES "public"."spray_lab_sessions"("id") ON DELETE set null ON UPDATE no action;
	END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'training_program_checkpoints_validation_link_id_spray_lab_validation_links_id_fk') THEN
		ALTER TABLE "training_program_checkpoints" ADD CONSTRAINT "training_program_checkpoints_validation_link_id_spray_lab_validation_links_id_fk" FOREIGN KEY ("validation_link_id") REFERENCES "public"."spray_lab_validation_links"("id") ON DELETE set null ON UPDATE no action;
	END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'training_program_checkpoints_precision_checkpoint_id_precision_checkpoints_id_fk') THEN
		ALTER TABLE "training_program_checkpoints" ADD CONSTRAINT "training_program_checkpoints_precision_checkpoint_id_precision_checkpoints_id_fk" FOREIGN KEY ("precision_checkpoint_id") REFERENCES "public"."precision_checkpoints"("id") ON DELETE set null ON UPDATE no action;
	END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'training_program_events_user_id_users_id_fk') THEN
		ALTER TABLE "training_program_events" ADD CONSTRAINT "training_program_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
	END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'training_program_events_cycle_id_training_program_cycles_id_fk') THEN
		ALTER TABLE "training_program_events" ADD CONSTRAINT "training_program_events_cycle_id_training_program_cycles_id_fk" FOREIGN KEY ("cycle_id") REFERENCES "public"."training_program_cycles"("id") ON DELETE cascade ON UPDATE no action;
	END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'training_program_events_mission_id_training_program_missions_id_fk') THEN
		ALTER TABLE "training_program_events" ADD CONSTRAINT "training_program_events_mission_id_training_program_missions_id_fk" FOREIGN KEY ("mission_id") REFERENCES "public"."training_program_missions"("id") ON DELETE set null ON UPDATE no action;
	END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'training_program_events_checkpoint_id_training_program_checkpoints_id_fk') THEN
		ALTER TABLE "training_program_events" ADD CONSTRAINT "training_program_events_checkpoint_id_training_program_checkpoints_id_fk" FOREIGN KEY ("checkpoint_id") REFERENCES "public"."training_program_checkpoints"("id") ON DELETE set null ON UPDATE no action;
	END IF;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "training_program_cycles_user_state_updated_idx" ON "training_program_cycles" USING btree ("user_id","state","updated_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "training_program_cycles_user_kind_updated_idx" ON "training_program_cycles" USING btree ("user_id","kind","updated_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "training_program_cycles_user_context_state_idx" ON "training_program_cycles" USING btree ("user_id","strict_context_key","state");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "training_program_cycles_base_analysis_idx" ON "training_program_cycles" USING btree ("base_analysis_session_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "training_program_cycles_active_line_idx" ON "training_program_cycles" USING btree ("user_id","active_line_context_key");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "training_program_cycles_current_mission_idx" ON "training_program_cycles" USING btree ("current_mission_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "training_program_weeks_cycle_week_uidx" ON "training_program_weeks" USING btree ("cycle_id","week_number");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "training_program_weeks_user_state_updated_idx" ON "training_program_weeks" USING btree ("user_id","state","updated_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "training_program_weeks_cycle_state_idx" ON "training_program_weeks" USING btree ("cycle_id","state");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "training_program_missions_week_slot_uidx" ON "training_program_missions" USING btree ("week_id","slot");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "training_program_missions_user_status_updated_idx" ON "training_program_missions" USING btree ("user_id","status","updated_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "training_program_missions_cycle_status_idx" ON "training_program_missions" USING btree ("cycle_id","status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "training_program_missions_cycle_week_idx" ON "training_program_missions" USING btree ("cycle_id","week_number");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "training_program_missions_lab_session_idx" ON "training_program_missions" USING btree ("lab_session_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "training_program_missions_validation_link_idx" ON "training_program_missions" USING btree ("validation_link_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "training_program_checkpoints_cycle_layer_created_idx" ON "training_program_checkpoints" USING btree ("cycle_id","layer","created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "training_program_checkpoints_user_layer_created_idx" ON "training_program_checkpoints" USING btree ("user_id","layer","created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "training_program_checkpoints_week_idx" ON "training_program_checkpoints" USING btree ("week_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "training_program_checkpoints_validation_link_idx" ON "training_program_checkpoints" USING btree ("validation_link_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "training_program_checkpoints_precision_idx" ON "training_program_checkpoints" USING btree ("precision_checkpoint_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "training_program_events_cycle_occurred_idx" ON "training_program_events" USING btree ("cycle_id","occurred_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "training_program_events_user_occurred_idx" ON "training_program_events" USING btree ("user_id","occurred_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "training_program_events_mission_idx" ON "training_program_events" USING btree ("mission_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "training_program_events_checkpoint_idx" ON "training_program_events" USING btree ("checkpoint_id");
