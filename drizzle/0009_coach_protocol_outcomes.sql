CREATE TABLE "coach_protocol_outcomes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"analysis_session_id" uuid NOT NULL,
	"coach_plan_id" text NOT NULL,
	"protocol_id" text NOT NULL,
	"focus_area" text NOT NULL,
	"status" text NOT NULL,
	"reason_codes" jsonb DEFAULT '[]' NOT NULL,
	"note" text,
	"revision_of_id" uuid,
	"evidence_strength" text NOT NULL,
	"conflict_payload" jsonb,
	"payload" jsonb DEFAULT '{}' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "coach_protocol_outcomes" ADD CONSTRAINT "coach_protocol_outcomes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "coach_protocol_outcomes" ADD CONSTRAINT "coach_protocol_outcomes_analysis_session_id_analysis_sessions_id_fk" FOREIGN KEY ("analysis_session_id") REFERENCES "public"."analysis_sessions"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "coach_protocol_outcomes" ADD CONSTRAINT "coach_protocol_outcomes_revision_of_id_coach_protocol_outcomes_id_fk" FOREIGN KEY ("revision_of_id") REFERENCES "public"."coach_protocol_outcomes"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "coach_protocol_outcomes_user_status_updated_idx" ON "coach_protocol_outcomes" USING btree ("user_id","status","updated_at");
--> statement-breakpoint
CREATE INDEX "coach_protocol_outcomes_session_created_idx" ON "coach_protocol_outcomes" USING btree ("analysis_session_id","created_at");
--> statement-breakpoint
CREATE INDEX "coach_protocol_outcomes_user_protocol_idx" ON "coach_protocol_outcomes" USING btree ("user_id","protocol_id");
--> statement-breakpoint
CREATE INDEX "coach_protocol_outcomes_revision_idx" ON "coach_protocol_outcomes" USING btree ("revision_of_id");
