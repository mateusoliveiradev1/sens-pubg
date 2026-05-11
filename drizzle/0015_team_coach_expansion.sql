CREATE TABLE IF NOT EXISTS "team_coach_workspaces" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_user_id" uuid NOT NULL REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action,
	"name" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'active' NOT NULL,
	"seat_limit" integer DEFAULT 8 NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"archived_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "team_coach_workspace_memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL REFERENCES "public"."team_coach_workspaces"("id") ON DELETE cascade ON UPDATE no action,
	"user_id" uuid NOT NULL REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action,
	"role" text DEFAULT 'player' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"seat_state" text DEFAULT 'occupied' NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL,
	"left_at" timestamp,
	"suspended_at" timestamp,
	"revoked_at" timestamp,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "team_coach_workspace_invites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL REFERENCES "public"."team_coach_workspaces"("id") ON DELETE cascade ON UPDATE no action,
	"created_by_user_id" uuid NOT NULL REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action,
	"invited_user_id" uuid REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action,
	"invited_email" text,
	"intended_role" text DEFAULT 'player' NOT NULL,
	"invite_code" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp NOT NULL,
	"accepted_by_user_id" uuid REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action,
	"accepted_at" timestamp,
	"revoked_by_user_id" uuid REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action,
	"revoked_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "team_coach_report_shares" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL REFERENCES "public"."team_coach_workspaces"("id") ON DELETE cascade ON UPDATE no action,
	"player_user_id" uuid NOT NULL REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action,
	"shared_by_user_id" uuid NOT NULL REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action,
	"revoked_by_user_id" uuid REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action,
	"consent_status" text DEFAULT 'granted' NOT NULL,
	"consent_scopes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"share_status" text DEFAULT 'active' NOT NULL,
	"team_safe_snapshot" jsonb NOT NULL,
	"source_analysis_session_id" uuid REFERENCES "public"."analysis_sessions"("id") ON DELETE set null ON UPDATE no action,
	"source_history_session_id" uuid REFERENCES "public"."analysis_sessions"("id") ON DELETE set null ON UPDATE no action,
	"source_protocol_revision_id" uuid REFERENCES "public"."complete_training_protocol_revisions"("id") ON DELETE set null ON UPDATE no action,
	"source_spray_lab_session_id" uuid REFERENCES "public"."spray_lab_sessions"("id") ON DELETE set null ON UPDATE no action,
	"source_training_program_cycle_id" text REFERENCES "public"."training_program_cycles"("id") ON DELETE set null ON UPDATE no action,
	"source_validation_link_id" uuid REFERENCES "public"."spray_lab_validation_links"("id") ON DELETE set null ON UPDATE no action,
	"granted_at" timestamp DEFAULT now() NOT NULL,
	"revoked_at" timestamp,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "team_coach_review_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL REFERENCES "public"."team_coach_workspaces"("id") ON DELETE cascade ON UPDATE no action,
	"share_id" uuid NOT NULL REFERENCES "public"."team_coach_report_shares"("id") ON DELETE cascade ON UPDATE no action,
	"author_user_id" uuid NOT NULL REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action,
	"player_user_id" uuid NOT NULL REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action,
	"note" text NOT NULL,
	"requested_next_action" text,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"archived_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "team_coach_review_status_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL REFERENCES "public"."team_coach_workspaces"("id") ON DELETE cascade ON UPDATE no action,
	"share_id" uuid NOT NULL REFERENCES "public"."team_coach_report_shares"("id") ON DELETE cascade ON UPDATE no action,
	"actor_user_id" uuid NOT NULL REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action,
	"player_user_id" uuid NOT NULL REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action,
	"previous_status" text,
	"next_status" text NOT NULL,
	"reason" text,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "team_coach_review_packets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL REFERENCES "public"."team_coach_workspaces"("id") ON DELETE cascade ON UPDATE no action,
	"share_id" uuid NOT NULL REFERENCES "public"."team_coach_report_shares"("id") ON DELETE cascade ON UPDATE no action,
	"created_by_user_id" uuid NOT NULL REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action,
	"player_user_id" uuid NOT NULL REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action,
	"visibility" text DEFAULT 'private' NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"title" text NOT NULL,
	"team_safe_snapshot" jsonb NOT NULL,
	"review_status" text,
	"requested_next_action" text,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"revoked_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "team_coach_packet_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"packet_id" uuid NOT NULL REFERENCES "public"."team_coach_review_packets"("id") ON DELETE cascade ON UPDATE no action,
	"workspace_id" uuid NOT NULL REFERENCES "public"."team_coach_workspaces"("id") ON DELETE cascade ON UPDATE no action,
	"owner_user_id" uuid NOT NULL REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action,
	"token_verifier_hash" text NOT NULL,
	"token_verifier_prefix" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"expires_at" timestamp,
	"revoked_by_user_id" uuid REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action,
	"revoked_at" timestamp,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "team_coach_seat_ledger" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL REFERENCES "public"."team_coach_workspaces"("id") ON DELETE cascade ON UPDATE no action,
	"actor_user_id" uuid REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action,
	"target_user_id" uuid REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action,
	"invite_id" uuid REFERENCES "public"."team_coach_workspace_invites"("id") ON DELETE set null ON UPDATE no action,
	"membership_id" uuid REFERENCES "public"."team_coach_workspace_memberships"("id") ON DELETE set null ON UPDATE no action,
	"event_type" text NOT NULL,
	"seat_state" text NOT NULL,
	"delta" integer DEFAULT 0 NOT NULL,
	"seat_limit" integer NOT NULL,
	"occupied_seats" integer NOT NULL,
	"invited_seats" integer NOT NULL,
	"reason_code" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "team_coach_audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL REFERENCES "public"."team_coach_workspaces"("id") ON DELETE cascade ON UPDATE no action,
	"actor_user_id" uuid REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action,
	"target_user_id" uuid REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action,
	"invite_id" uuid REFERENCES "public"."team_coach_workspace_invites"("id") ON DELETE set null ON UPDATE no action,
	"membership_id" uuid REFERENCES "public"."team_coach_workspace_memberships"("id") ON DELETE set null ON UPDATE no action,
	"share_id" uuid REFERENCES "public"."team_coach_report_shares"("id") ON DELETE set null ON UPDATE no action,
	"note_id" uuid REFERENCES "public"."team_coach_review_notes"("id") ON DELETE set null ON UPDATE no action,
	"packet_id" uuid REFERENCES "public"."team_coach_review_packets"("id") ON DELETE set null ON UPDATE no action,
	"packet_link_id" uuid REFERENCES "public"."team_coach_packet_links"("id") ON DELETE set null ON UPDATE no action,
	"event_type" text NOT NULL,
	"reason_code" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "team_coach_workspaces_owner_status_idx" ON "team_coach_workspaces" USING btree ("owner_user_id","status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "team_coach_workspaces_status_updated_idx" ON "team_coach_workspaces" USING btree ("status","updated_at");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "team_coach_workspace_memberships_workspace_user_uidx" ON "team_coach_workspace_memberships" USING btree ("workspace_id","user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "team_coach_workspace_memberships_workspace_status_idx" ON "team_coach_workspace_memberships" USING btree ("workspace_id","status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "team_coach_workspace_memberships_user_status_idx" ON "team_coach_workspace_memberships" USING btree ("user_id","status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "team_coach_workspace_memberships_role_status_idx" ON "team_coach_workspace_memberships" USING btree ("role","status");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "team_coach_workspace_invites_code_uidx" ON "team_coach_workspace_invites" USING btree ("invite_code");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "team_coach_workspace_invites_workspace_status_idx" ON "team_coach_workspace_invites" USING btree ("workspace_id","status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "team_coach_workspace_invites_invited_user_status_idx" ON "team_coach_workspace_invites" USING btree ("invited_user_id","status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "team_coach_workspace_invites_email_status_idx" ON "team_coach_workspace_invites" USING btree ("invited_email","status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "team_coach_workspace_invites_expires_idx" ON "team_coach_workspace_invites" USING btree ("expires_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "team_coach_report_shares_workspace_player_status_idx" ON "team_coach_report_shares" USING btree ("workspace_id","player_user_id","share_status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "team_coach_report_shares_player_status_idx" ON "team_coach_report_shares" USING btree ("player_user_id","share_status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "team_coach_report_shares_source_analysis_idx" ON "team_coach_report_shares" USING btree ("source_analysis_session_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "team_coach_report_shares_source_program_idx" ON "team_coach_report_shares" USING btree ("source_training_program_cycle_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "team_coach_review_notes_workspace_created_idx" ON "team_coach_review_notes" USING btree ("workspace_id","created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "team_coach_review_notes_share_created_idx" ON "team_coach_review_notes" USING btree ("share_id","created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "team_coach_review_notes_player_created_idx" ON "team_coach_review_notes" USING btree ("player_user_id","created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "team_coach_review_status_events_workspace_created_idx" ON "team_coach_review_status_events" USING btree ("workspace_id","created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "team_coach_review_status_events_share_created_idx" ON "team_coach_review_status_events" USING btree ("share_id","created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "team_coach_review_status_events_next_status_idx" ON "team_coach_review_status_events" USING btree ("next_status","created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "team_coach_review_packets_workspace_status_idx" ON "team_coach_review_packets" USING btree ("workspace_id","status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "team_coach_review_packets_share_status_idx" ON "team_coach_review_packets" USING btree ("share_id","status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "team_coach_review_packets_player_updated_idx" ON "team_coach_review_packets" USING btree ("player_user_id","updated_at");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "team_coach_packet_links_token_hash_uidx" ON "team_coach_packet_links" USING btree ("token_verifier_hash");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "team_coach_packet_links_packet_status_idx" ON "team_coach_packet_links" USING btree ("packet_id","status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "team_coach_packet_links_workspace_status_idx" ON "team_coach_packet_links" USING btree ("workspace_id","status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "team_coach_packet_links_expires_idx" ON "team_coach_packet_links" USING btree ("expires_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "team_coach_seat_ledger_workspace_created_idx" ON "team_coach_seat_ledger" USING btree ("workspace_id","created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "team_coach_seat_ledger_invite_idx" ON "team_coach_seat_ledger" USING btree ("invite_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "team_coach_seat_ledger_membership_idx" ON "team_coach_seat_ledger" USING btree ("membership_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "team_coach_audit_events_workspace_created_idx" ON "team_coach_audit_events" USING btree ("workspace_id","created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "team_coach_audit_events_actor_created_idx" ON "team_coach_audit_events" USING btree ("actor_user_id","created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "team_coach_audit_events_target_created_idx" ON "team_coach_audit_events" USING btree ("target_user_id","created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "team_coach_audit_events_type_created_idx" ON "team_coach_audit_events" USING btree ("event_type","created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "team_coach_audit_events_share_created_idx" ON "team_coach_audit_events" USING btree ("share_id","created_at");
