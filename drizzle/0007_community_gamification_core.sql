CREATE TABLE "community_seasons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"theme" text NOT NULL,
	"summary" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"starts_at" timestamp NOT NULL,
	"ends_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "community_missions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"season_id" uuid,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"theme" text,
	"mission_type" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"cadence" text DEFAULT 'one_time' NOT NULL,
	"target_count" integer DEFAULT 1 NOT NULL,
	"reward_xp" integer DEFAULT 0 NOT NULL,
	"eligible_actions" jsonb DEFAULT '[]' NOT NULL,
	"config" jsonb DEFAULT '{}' NOT NULL,
	"starts_at" timestamp,
	"ends_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "community_squads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_user_id" uuid NOT NULL,
	"season_id" uuid,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"visibility" text DEFAULT 'private' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"member_limit" integer DEFAULT 4 NOT NULL,
	"active_goal" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "community_user_progression_aggregates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"season_id" uuid,
	"scope" text DEFAULT 'evergreen' NOT NULL,
	"scope_key" text DEFAULT 'evergreen' NOT NULL,
	"total_xp" integer DEFAULT 0 NOT NULL,
	"current_level" integer DEFAULT 1 NOT NULL,
	"current_level_xp" integer DEFAULT 0 NOT NULL,
	"next_level_xp" integer DEFAULT 100 NOT NULL,
	"active_mission_count" integer DEFAULT 0 NOT NULL,
	"current_streak" integer DEFAULT 0 NOT NULL,
	"longest_streak" integer DEFAULT 0 NOT NULL,
	"streak_state" text DEFAULT 'inactive' NOT NULL,
	"last_meaningful_at" timestamp,
	"last_window_started_at" timestamp,
	"last_window_ended_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "community_squad_memberships" (
	"squad_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"is_publicly_visible" boolean DEFAULT true NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL,
	"left_at" timestamp,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "community_squad_memberships_squad_id_user_id_pk" PRIMARY KEY("squad_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "community_squad_invites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"squad_id" uuid NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"invited_user_id" uuid,
	"accepted_by_user_id" uuid,
	"invite_code" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp NOT NULL,
	"accepted_at" timestamp,
	"revoked_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "community_progression_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"season_id" uuid,
	"mission_id" uuid,
	"squad_id" uuid,
	"actor_user_id" uuid NOT NULL,
	"beneficiary_user_id" uuid,
	"event_type" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"raw_xp" integer DEFAULT 0 NOT NULL,
	"effective_xp" integer DEFAULT 0 NOT NULL,
	"metadata" jsonb DEFAULT '{}' NOT NULL,
	"occurred_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "community_reward_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"season_id" uuid,
	"mission_id" uuid,
	"squad_id" uuid,
	"user_id" uuid,
	"awarded_by_event_id" uuid,
	"owner_type" text NOT NULL,
	"reward_kind" text NOT NULL,
	"reward_key" text NOT NULL,
	"reward_fingerprint" text NOT NULL,
	"status" text DEFAULT 'earned' NOT NULL,
	"display_state" text DEFAULT 'hidden' NOT NULL,
	"is_public_safe" boolean DEFAULT false NOT NULL,
	"label" text NOT NULL,
	"description" text,
	"public_payload" jsonb DEFAULT '{}' NOT NULL,
	"metadata" jsonb DEFAULT '{}' NOT NULL,
	"earned_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp,
	"revoked_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "community_missions" ADD CONSTRAINT "community_missions_season_id_community_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."community_seasons"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "community_squads" ADD CONSTRAINT "community_squads_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "community_squads" ADD CONSTRAINT "community_squads_season_id_community_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."community_seasons"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "community_user_progression_aggregates" ADD CONSTRAINT "community_user_progression_aggregates_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "community_user_progression_aggregates" ADD CONSTRAINT "community_user_progression_aggregates_season_id_community_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."community_seasons"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "community_squad_memberships" ADD CONSTRAINT "community_squad_memberships_squad_id_community_squads_id_fk" FOREIGN KEY ("squad_id") REFERENCES "public"."community_squads"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "community_squad_memberships" ADD CONSTRAINT "community_squad_memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "community_squad_invites" ADD CONSTRAINT "community_squad_invites_squad_id_community_squads_id_fk" FOREIGN KEY ("squad_id") REFERENCES "public"."community_squads"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "community_squad_invites" ADD CONSTRAINT "community_squad_invites_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "community_squad_invites" ADD CONSTRAINT "community_squad_invites_invited_user_id_users_id_fk" FOREIGN KEY ("invited_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "community_squad_invites" ADD CONSTRAINT "community_squad_invites_accepted_by_user_id_users_id_fk" FOREIGN KEY ("accepted_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "community_progression_events" ADD CONSTRAINT "community_progression_events_season_id_community_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."community_seasons"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "community_progression_events" ADD CONSTRAINT "community_progression_events_mission_id_community_missions_id_fk" FOREIGN KEY ("mission_id") REFERENCES "public"."community_missions"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "community_progression_events" ADD CONSTRAINT "community_progression_events_squad_id_community_squads_id_fk" FOREIGN KEY ("squad_id") REFERENCES "public"."community_squads"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "community_progression_events" ADD CONSTRAINT "community_progression_events_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "community_progression_events" ADD CONSTRAINT "community_progression_events_beneficiary_user_id_users_id_fk" FOREIGN KEY ("beneficiary_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "community_reward_records" ADD CONSTRAINT "community_reward_records_season_id_community_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."community_seasons"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "community_reward_records" ADD CONSTRAINT "community_reward_records_mission_id_community_missions_id_fk" FOREIGN KEY ("mission_id") REFERENCES "public"."community_missions"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "community_reward_records" ADD CONSTRAINT "community_reward_records_squad_id_community_squads_id_fk" FOREIGN KEY ("squad_id") REFERENCES "public"."community_squads"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "community_reward_records" ADD CONSTRAINT "community_reward_records_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "community_reward_records" ADD CONSTRAINT "community_reward_records_awarded_by_event_id_community_progression_events_id_fk" FOREIGN KEY ("awarded_by_event_id") REFERENCES "public"."community_progression_events"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "community_seasons_slug_uidx" ON "community_seasons" USING btree ("slug");
--> statement-breakpoint
CREATE INDEX "community_seasons_status_window_idx" ON "community_seasons" USING btree ("status","starts_at","ends_at");
--> statement-breakpoint
CREATE UNIQUE INDEX "community_missions_slug_uidx" ON "community_missions" USING btree ("slug");
--> statement-breakpoint
CREATE INDEX "community_missions_status_window_idx" ON "community_missions" USING btree ("status","cadence","starts_at","ends_at");
--> statement-breakpoint
CREATE UNIQUE INDEX "community_squads_slug_uidx" ON "community_squads" USING btree ("slug");
--> statement-breakpoint
CREATE INDEX "community_squads_owner_idx" ON "community_squads" USING btree ("owner_user_id");
--> statement-breakpoint
CREATE INDEX "community_squads_status_idx" ON "community_squads" USING btree ("status","visibility");
--> statement-breakpoint
CREATE UNIQUE INDEX "community_user_progression_aggregates_scope_uidx" ON "community_user_progression_aggregates" USING btree ("user_id","scope","scope_key");
--> statement-breakpoint
CREATE INDEX "community_user_progression_aggregates_season_idx" ON "community_user_progression_aggregates" USING btree ("season_id","user_id");
--> statement-breakpoint
CREATE INDEX "community_squad_memberships_user_idx" ON "community_squad_memberships" USING btree ("user_id","status");
--> statement-breakpoint
CREATE UNIQUE INDEX "community_squad_invites_code_uidx" ON "community_squad_invites" USING btree ("invite_code");
--> statement-breakpoint
CREATE INDEX "community_squad_invites_squad_idx" ON "community_squad_invites" USING btree ("squad_id","status");
--> statement-breakpoint
CREATE INDEX "community_squad_invites_user_idx" ON "community_squad_invites" USING btree ("invited_user_id","status");
--> statement-breakpoint
CREATE UNIQUE INDEX "community_progression_events_idempotency_uidx" ON "community_progression_events" USING btree ("idempotency_key");
--> statement-breakpoint
CREATE INDEX "community_progression_events_actor_idx" ON "community_progression_events" USING btree ("actor_user_id","occurred_at");
--> statement-breakpoint
CREATE INDEX "community_progression_events_beneficiary_idx" ON "community_progression_events" USING btree ("beneficiary_user_id","occurred_at");
--> statement-breakpoint
CREATE INDEX "community_progression_events_scope_idx" ON "community_progression_events" USING btree ("season_id","mission_id","squad_id","occurred_at");
--> statement-breakpoint
CREATE UNIQUE INDEX "community_reward_records_fingerprint_uidx" ON "community_reward_records" USING btree ("reward_fingerprint");
--> statement-breakpoint
CREATE INDEX "community_reward_records_owner_idx" ON "community_reward_records" USING btree ("owner_type","user_id","squad_id");
--> statement-breakpoint
CREATE INDEX "community_reward_records_display_idx" ON "community_reward_records" USING btree ("display_state","status");
