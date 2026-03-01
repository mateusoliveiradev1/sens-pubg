CREATE TABLE "accounts" (
	"user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"provider_account_id" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text,
	CONSTRAINT "accounts_provider_provider_account_id_pk" PRIMARY KEY("provider","provider_account_id")
);
--> statement-breakpoint
CREATE TABLE "analysis_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"weapon_id" text NOT NULL,
	"scope_id" text NOT NULL,
	"stance" text DEFAULT 'standing' NOT NULL,
	"attachments" jsonb DEFAULT '{}' NOT NULL,
	"distance" integer NOT NULL,
	"stability_score" real NOT NULL,
	"vertical_control" real NOT NULL,
	"horizontal_noise" real NOT NULL,
	"recoil_response_ms" real NOT NULL,
	"drift_bias" jsonb NOT NULL,
	"consistency_score" real NOT NULL,
	"diagnoses" jsonb NOT NULL,
	"trajectory_data" jsonb,
	"coaching_data" jsonb,
	"full_result" jsonb,
	"spray_score" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"admin_id" uuid NOT NULL,
	"action" text NOT NULL,
	"target" text,
	"details" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bot_heartbeat" (
	"id" text PRIMARY KEY DEFAULT 'main_bot' NOT NULL,
	"last_seen" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "player_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"mouse_model" text NOT NULL,
	"mouse_sensor" text NOT NULL,
	"mouse_dpi" integer NOT NULL,
	"mouse_polling_rate" integer NOT NULL,
	"mouse_weight" real NOT NULL,
	"mouse_lod" real NOT NULL,
	"mousepad_model" text NOT NULL,
	"mousepad_width" real NOT NULL,
	"mousepad_height" real NOT NULL,
	"mousepad_type" text NOT NULL,
	"mousepad_material" text NOT NULL,
	"grip_style" text NOT NULL,
	"play_style" text NOT NULL,
	"monitor_resolution" text NOT NULL,
	"monitor_refresh_rate" integer NOT NULL,
	"monitor_panel" text NOT NULL,
	"general_sens" real NOT NULL,
	"ads_sens" real NOT NULL,
	"scope_sens" jsonb NOT NULL,
	"fov" integer NOT NULL,
	"vertical_multiplier" real NOT NULL,
	"mouse_acceleration" boolean DEFAULT false NOT NULL,
	"arm_length" text NOT NULL,
	"desk_space" real NOT NULL,
	"bio" text,
	"twitter" text,
	"twitch" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "player_profiles_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "sensitivity_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"profile_type" text NOT NULL,
	"general_sens" real NOT NULL,
	"ads_sens" real NOT NULL,
	"scope_sens" jsonb NOT NULL,
	"applied" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"session_token" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"expires" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "system_settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text,
	"email" text,
	"email_verified" timestamp,
	"image" text,
	"language" text DEFAULT 'pt-BR' NOT NULL,
	"discord_id" text,
	"role" text DEFAULT 'user' NOT NULL,
	"fov" integer DEFAULT 90 NOT NULL,
	"resolution" text DEFAULT '1920x1080' NOT NULL,
	"mouse_dpi" integer DEFAULT 800 NOT NULL,
	"sens_general" real DEFAULT 50 NOT NULL,
	"sens_1x" real DEFAULT 50 NOT NULL,
	"sens_3x" real DEFAULT 50 NOT NULL,
	"sens_4x" real DEFAULT 50 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_discord_id_unique" UNIQUE("discord_id")
);
--> statement-breakpoint
CREATE TABLE "verification_tokens" (
	"identifier" text NOT NULL,
	"token" text NOT NULL,
	"expires" timestamp NOT NULL,
	CONSTRAINT "verification_tokens_identifier_token_pk" PRIMARY KEY("identifier","token")
);
--> statement-breakpoint
CREATE TABLE "weapon_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"base_vertical_recoil" real NOT NULL,
	"base_horizontal_rng" real NOT NULL,
	"fire_rate_ms" integer NOT NULL,
	"multipliers" jsonb DEFAULT '{}' NOT NULL,
	"attachments" jsonb DEFAULT '[]' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "weapon_profiles_name_unique" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analysis_sessions" ADD CONSTRAINT "analysis_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_admin_id_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_profiles" ADD CONSTRAINT "player_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sensitivity_history" ADD CONSTRAINT "sensitivity_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sensitivity_history" ADD CONSTRAINT "sensitivity_history_session_id_analysis_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."analysis_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;