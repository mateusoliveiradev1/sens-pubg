CREATE TABLE "community_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"display_name" text NOT NULL,
	"headline" text,
	"bio" text,
	"avatar_url" text,
	"links" jsonb DEFAULT '[]' NOT NULL,
	"visibility" text DEFAULT 'public' NOT NULL,
	"creator_program_status" text DEFAULT 'none' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "community_profiles_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "community_profiles_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "community_posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"author_id" uuid NOT NULL,
	"community_profile_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"type" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"visibility" text DEFAULT 'public' NOT NULL,
	"title" text NOT NULL,
	"excerpt" text NOT NULL,
	"body_markdown" text NOT NULL,
	"source_analysis_session_id" uuid,
	"primary_weapon_id" text NOT NULL,
	"primary_patch_version" text NOT NULL,
	"primary_diagnosis_key" text NOT NULL,
	"copy_sens_preset" jsonb NOT NULL,
	"required_entitlement_key" text,
	"featured_until" timestamp,
	"published_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "community_post_analysis_snapshots" (
	"post_id" uuid PRIMARY KEY NOT NULL,
	"analysis_session_id" uuid NOT NULL,
	"analysis_result_id" text NOT NULL,
	"analysis_timestamp" timestamp with time zone NOT NULL,
	"analysis_result_schema_version" integer NOT NULL,
	"patch_version" text NOT NULL,
	"weapon_id" text NOT NULL,
	"scope_id" text NOT NULL,
	"distance" integer NOT NULL,
	"stance" text NOT NULL,
	"attachments_snapshot" jsonb NOT NULL,
	"metrics_snapshot" jsonb NOT NULL,
	"diagnoses_snapshot" jsonb NOT NULL,
	"coaching_snapshot" jsonb NOT NULL,
	"sens_snapshot" jsonb NOT NULL,
	"tracking_snapshot" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "community_profiles" ADD CONSTRAINT "community_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "community_posts" ADD CONSTRAINT "community_posts_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "community_posts" ADD CONSTRAINT "community_posts_community_profile_id_community_profiles_id_fk" FOREIGN KEY ("community_profile_id") REFERENCES "public"."community_profiles"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "community_posts" ADD CONSTRAINT "community_posts_source_analysis_session_id_analysis_sessions_id_fk" FOREIGN KEY ("source_analysis_session_id") REFERENCES "public"."analysis_sessions"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "community_post_analysis_snapshots" ADD CONSTRAINT "community_post_analysis_snapshots_post_id_community_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."community_posts"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "community_post_analysis_snapshots" ADD CONSTRAINT "community_post_analysis_snapshots_analysis_session_id_analysis_sessions_id_fk" FOREIGN KEY ("analysis_session_id") REFERENCES "public"."analysis_sessions"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "community_posts_slug_uidx" ON "community_posts" USING btree ("slug");
