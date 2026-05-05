CREATE TABLE "precision_evolution_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"compatibility_key" text NOT NULL,
	"status" text NOT NULL,
	"variable_in_test" text NOT NULL,
	"baseline_session_id" uuid,
	"current_session_id" uuid,
	"valid_clip_count" integer DEFAULT 0 NOT NULL,
	"blocked_clip_count" integer DEFAULT 0 NOT NULL,
	"payload" jsonb DEFAULT '{}' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "precision_checkpoints" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"line_id" uuid NOT NULL,
	"analysis_session_id" uuid,
	"state" text NOT NULL,
	"variable_in_test" text NOT NULL,
	"payload" jsonb DEFAULT '{}' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "precision_evolution_lines" ADD CONSTRAINT "precision_evolution_lines_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "precision_evolution_lines" ADD CONSTRAINT "precision_evolution_lines_baseline_session_id_analysis_sessions_id_fk" FOREIGN KEY ("baseline_session_id") REFERENCES "public"."analysis_sessions"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "precision_evolution_lines" ADD CONSTRAINT "precision_evolution_lines_current_session_id_analysis_sessions_id_fk" FOREIGN KEY ("current_session_id") REFERENCES "public"."analysis_sessions"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "precision_checkpoints" ADD CONSTRAINT "precision_checkpoints_line_id_precision_evolution_lines_id_fk" FOREIGN KEY ("line_id") REFERENCES "public"."precision_evolution_lines"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "precision_checkpoints" ADD CONSTRAINT "precision_checkpoints_analysis_session_id_analysis_sessions_id_fk" FOREIGN KEY ("analysis_session_id") REFERENCES "public"."analysis_sessions"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "precision_evolution_lines_user_key_uidx" ON "precision_evolution_lines" USING btree ("user_id","compatibility_key");
--> statement-breakpoint
CREATE INDEX "precision_evolution_lines_user_status_idx" ON "precision_evolution_lines" USING btree ("user_id","status");
--> statement-breakpoint
CREATE INDEX "precision_evolution_lines_current_session_idx" ON "precision_evolution_lines" USING btree ("current_session_id");
--> statement-breakpoint
CREATE INDEX "precision_checkpoints_line_created_idx" ON "precision_checkpoints" USING btree ("line_id","created_at");
--> statement-breakpoint
CREATE INDEX "precision_checkpoints_session_idx" ON "precision_checkpoints" USING btree ("analysis_session_id");
