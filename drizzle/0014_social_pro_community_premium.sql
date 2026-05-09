CREATE TABLE IF NOT EXISTS "social_pro_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_user_id" uuid NOT NULL,
	"community_profile_id" uuid,
	"public_slug" text,
	"visibility" text DEFAULT 'link_private' NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"title" text NOT NULL,
	"public_safe_snapshot" jsonb NOT NULL,
	"source_analysis_session_id" uuid,
	"source_history_session_id" uuid,
	"source_protocol_revision_id" uuid,
	"source_spray_lab_session_id" uuid,
	"source_training_program_cycle_id" text,
	"source_validation_link_id" uuid,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"published_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"archived_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "social_pro_report_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"report_id" uuid NOT NULL,
	"owner_user_id" uuid NOT NULL,
	"token_verifier_hash" text NOT NULL,
	"token_verifier_prefix" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"regenerated_from_link_id" uuid,
	"revoked_by_user_id" uuid,
	"revoked_at" timestamp,
	"expires_at" timestamp,
	"last_regenerated_at" timestamp,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "social_pro_report_audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"report_id" uuid NOT NULL,
	"actor_user_id" uuid,
	"link_id" uuid,
	"event_type" text NOT NULL,
	"report_status" text,
	"reason_key" text,
	"public_safe_snapshot" jsonb,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "social_pro_collections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_user_id" uuid NOT NULL,
	"mode" text DEFAULT 'manual' NOT NULL,
	"visibility" text DEFAULT 'private' NOT NULL,
	"shareable" boolean DEFAULT false NOT NULL,
	"label" text NOT NULL,
	"description" text,
	"context_key" text NOT NULL,
	"weapon_id" text,
	"optic_id" text,
	"distance_meters" integer,
	"diagnosis_key" text,
	"active_line_id" text,
	"program_cycle_id" text,
	"spray_lab_lane_id" text,
	"objective_key" text,
	"validation_state" text,
	"blocker_key" text,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "social_pro_collection_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"collection_id" uuid NOT NULL,
	"owner_user_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"item_id" text NOT NULL,
	"social_pro_report_id" uuid,
	"community_post_id" uuid,
	"spray_lab_session_id" uuid,
	"training_program_mission_id" text,
	"validation_link_id" uuid,
	"context_key" text NOT NULL,
	"context_facets" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'social_pro_reports_owner_user_id_users_id_fk') THEN
		ALTER TABLE "social_pro_reports" ADD CONSTRAINT "social_pro_reports_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
	END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'social_pro_reports_community_profile_id_community_profiles_id_fk') THEN
		ALTER TABLE "social_pro_reports" ADD CONSTRAINT "social_pro_reports_community_profile_id_community_profiles_id_fk" FOREIGN KEY ("community_profile_id") REFERENCES "public"."community_profiles"("id") ON DELETE set null ON UPDATE no action;
	END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'social_pro_reports_source_analysis_session_id_analysis_sessions_id_fk') THEN
		ALTER TABLE "social_pro_reports" ADD CONSTRAINT "social_pro_reports_source_analysis_session_id_analysis_sessions_id_fk" FOREIGN KEY ("source_analysis_session_id") REFERENCES "public"."analysis_sessions"("id") ON DELETE set null ON UPDATE no action;
	END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'social_pro_reports_source_history_session_id_analysis_sessions_id_fk') THEN
		ALTER TABLE "social_pro_reports" ADD CONSTRAINT "social_pro_reports_source_history_session_id_analysis_sessions_id_fk" FOREIGN KEY ("source_history_session_id") REFERENCES "public"."analysis_sessions"("id") ON DELETE set null ON UPDATE no action;
	END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'social_pro_reports_source_protocol_revision_id_complete_training_protocol_revisions_id_fk') THEN
		ALTER TABLE "social_pro_reports" ADD CONSTRAINT "social_pro_reports_source_protocol_revision_id_complete_training_protocol_revisions_id_fk" FOREIGN KEY ("source_protocol_revision_id") REFERENCES "public"."complete_training_protocol_revisions"("id") ON DELETE set null ON UPDATE no action;
	END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'social_pro_reports_source_spray_lab_session_id_spray_lab_sessions_id_fk') THEN
		ALTER TABLE "social_pro_reports" ADD CONSTRAINT "social_pro_reports_source_spray_lab_session_id_spray_lab_sessions_id_fk" FOREIGN KEY ("source_spray_lab_session_id") REFERENCES "public"."spray_lab_sessions"("id") ON DELETE set null ON UPDATE no action;
	END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'social_pro_reports_source_training_program_cycle_id_training_program_cycles_id_fk') THEN
		ALTER TABLE "social_pro_reports" ADD CONSTRAINT "social_pro_reports_source_training_program_cycle_id_training_program_cycles_id_fk" FOREIGN KEY ("source_training_program_cycle_id") REFERENCES "public"."training_program_cycles"("id") ON DELETE set null ON UPDATE no action;
	END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'social_pro_reports_source_validation_link_id_spray_lab_validation_links_id_fk') THEN
		ALTER TABLE "social_pro_reports" ADD CONSTRAINT "social_pro_reports_source_validation_link_id_spray_lab_validation_links_id_fk" FOREIGN KEY ("source_validation_link_id") REFERENCES "public"."spray_lab_validation_links"("id") ON DELETE set null ON UPDATE no action;
	END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'social_pro_report_links_report_id_social_pro_reports_id_fk') THEN
		ALTER TABLE "social_pro_report_links" ADD CONSTRAINT "social_pro_report_links_report_id_social_pro_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."social_pro_reports"("id") ON DELETE cascade ON UPDATE no action;
	END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'social_pro_report_links_owner_user_id_users_id_fk') THEN
		ALTER TABLE "social_pro_report_links" ADD CONSTRAINT "social_pro_report_links_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
	END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'social_pro_report_links_regenerated_from_link_id_social_pro_report_links_id_fk') THEN
		ALTER TABLE "social_pro_report_links" ADD CONSTRAINT "social_pro_report_links_regenerated_from_link_id_social_pro_report_links_id_fk" FOREIGN KEY ("regenerated_from_link_id") REFERENCES "public"."social_pro_report_links"("id") ON DELETE set null ON UPDATE no action;
	END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'social_pro_report_links_revoked_by_user_id_users_id_fk') THEN
		ALTER TABLE "social_pro_report_links" ADD CONSTRAINT "social_pro_report_links_revoked_by_user_id_users_id_fk" FOREIGN KEY ("revoked_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
	END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'social_pro_report_audit_events_report_id_social_pro_reports_id_fk') THEN
		ALTER TABLE "social_pro_report_audit_events" ADD CONSTRAINT "social_pro_report_audit_events_report_id_social_pro_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."social_pro_reports"("id") ON DELETE cascade ON UPDATE no action;
	END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'social_pro_report_audit_events_actor_user_id_users_id_fk') THEN
		ALTER TABLE "social_pro_report_audit_events" ADD CONSTRAINT "social_pro_report_audit_events_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
	END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'social_pro_report_audit_events_link_id_social_pro_report_links_id_fk') THEN
		ALTER TABLE "social_pro_report_audit_events" ADD CONSTRAINT "social_pro_report_audit_events_link_id_social_pro_report_links_id_fk" FOREIGN KEY ("link_id") REFERENCES "public"."social_pro_report_links"("id") ON DELETE set null ON UPDATE no action;
	END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'social_pro_collections_owner_user_id_users_id_fk') THEN
		ALTER TABLE "social_pro_collections" ADD CONSTRAINT "social_pro_collections_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
	END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'social_pro_collections_program_cycle_id_training_program_cycles_id_fk') THEN
		ALTER TABLE "social_pro_collections" ADD CONSTRAINT "social_pro_collections_program_cycle_id_training_program_cycles_id_fk" FOREIGN KEY ("program_cycle_id") REFERENCES "public"."training_program_cycles"("id") ON DELETE set null ON UPDATE no action;
	END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'social_pro_collection_items_collection_id_social_pro_collections_id_fk') THEN
		ALTER TABLE "social_pro_collection_items" ADD CONSTRAINT "social_pro_collection_items_collection_id_social_pro_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."social_pro_collections"("id") ON DELETE cascade ON UPDATE no action;
	END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'social_pro_collection_items_owner_user_id_users_id_fk') THEN
		ALTER TABLE "social_pro_collection_items" ADD CONSTRAINT "social_pro_collection_items_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
	END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'social_pro_collection_items_social_pro_report_id_social_pro_reports_id_fk') THEN
		ALTER TABLE "social_pro_collection_items" ADD CONSTRAINT "social_pro_collection_items_social_pro_report_id_social_pro_reports_id_fk" FOREIGN KEY ("social_pro_report_id") REFERENCES "public"."social_pro_reports"("id") ON DELETE set null ON UPDATE no action;
	END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'social_pro_collection_items_community_post_id_community_posts_id_fk') THEN
		ALTER TABLE "social_pro_collection_items" ADD CONSTRAINT "social_pro_collection_items_community_post_id_community_posts_id_fk" FOREIGN KEY ("community_post_id") REFERENCES "public"."community_posts"("id") ON DELETE set null ON UPDATE no action;
	END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'social_pro_collection_items_spray_lab_session_id_spray_lab_sessions_id_fk') THEN
		ALTER TABLE "social_pro_collection_items" ADD CONSTRAINT "social_pro_collection_items_spray_lab_session_id_spray_lab_sessions_id_fk" FOREIGN KEY ("spray_lab_session_id") REFERENCES "public"."spray_lab_sessions"("id") ON DELETE set null ON UPDATE no action;
	END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'social_pro_collection_items_training_program_mission_id_training_program_missions_id_fk') THEN
		ALTER TABLE "social_pro_collection_items" ADD CONSTRAINT "social_pro_collection_items_training_program_mission_id_training_program_missions_id_fk" FOREIGN KEY ("training_program_mission_id") REFERENCES "public"."training_program_missions"("id") ON DELETE set null ON UPDATE no action;
	END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'social_pro_collection_items_validation_link_id_spray_lab_validation_links_id_fk') THEN
		ALTER TABLE "social_pro_collection_items" ADD CONSTRAINT "social_pro_collection_items_validation_link_id_spray_lab_validation_links_id_fk" FOREIGN KEY ("validation_link_id") REFERENCES "public"."spray_lab_validation_links"("id") ON DELETE set null ON UPDATE no action;
	END IF;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "social_pro_reports_public_slug_uidx" ON "social_pro_reports" USING btree ("public_slug");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "social_pro_reports_owner_status_updated_idx" ON "social_pro_reports" USING btree ("owner_user_id","status","updated_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "social_pro_reports_visibility_status_idx" ON "social_pro_reports" USING btree ("visibility","status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "social_pro_reports_source_analysis_idx" ON "social_pro_reports" USING btree ("source_analysis_session_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "social_pro_reports_source_program_idx" ON "social_pro_reports" USING btree ("source_training_program_cycle_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "social_pro_report_links_token_hash_uidx" ON "social_pro_report_links" USING btree ("token_verifier_hash");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "social_pro_report_links_report_status_idx" ON "social_pro_report_links" USING btree ("report_id","status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "social_pro_report_links_owner_status_idx" ON "social_pro_report_links" USING btree ("owner_user_id","status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "social_pro_report_links_expiration_idx" ON "social_pro_report_links" USING btree ("expires_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "social_pro_report_audit_events_report_created_idx" ON "social_pro_report_audit_events" USING btree ("report_id","created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "social_pro_report_audit_events_link_created_idx" ON "social_pro_report_audit_events" USING btree ("link_id","created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "social_pro_report_audit_events_actor_created_idx" ON "social_pro_report_audit_events" USING btree ("actor_user_id","created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "social_pro_report_audit_events_type_created_idx" ON "social_pro_report_audit_events" USING btree ("event_type","created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "social_pro_collections_owner_updated_idx" ON "social_pro_collections" USING btree ("owner_user_id","updated_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "social_pro_collections_owner_mode_idx" ON "social_pro_collections" USING btree ("owner_user_id","mode");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "social_pro_collections_owner_context_idx" ON "social_pro_collections" USING btree ("owner_user_id","context_key");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "social_pro_collection_items_collection_item_uidx" ON "social_pro_collection_items" USING btree ("collection_id","kind","item_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "social_pro_collection_items_collection_kind_idx" ON "social_pro_collection_items" USING btree ("collection_id","kind");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "social_pro_collection_items_owner_kind_created_idx" ON "social_pro_collection_items" USING btree ("owner_user_id","kind","created_at");
