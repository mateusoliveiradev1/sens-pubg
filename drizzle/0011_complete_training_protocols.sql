CREATE TABLE IF NOT EXISTS "complete_training_protocol_revisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"analysis_session_id" uuid NOT NULL,
	"coach_plan_id" text NOT NULL,
	"protocol_id" text NOT NULL,
	"revision_reason" text NOT NULL,
	"tier_direction" text NOT NULL,
	"changed_fields" jsonb NOT NULL,
	"previous_protocol" jsonb NOT NULL,
	"revised_protocol" jsonb NOT NULL,
	"evidence_payload" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "training_protocol_transfer_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"analysis_session_id" uuid NOT NULL,
	"protocol_id" text NOT NULL,
	"situation" text NOT NULL,
	"weapon_id" text,
	"optic_id" text,
	"approximate_distance_meters" integer,
	"pressure_level" text NOT NULL,
	"felt_control" text NOT NULL,
	"result" text NOT NULL,
	"note" text,
	"counts_as_technical_validation" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "complete_training_protocol_revisions" ADD CONSTRAINT "complete_training_protocol_revisions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "complete_training_protocol_revisions" ADD CONSTRAINT "complete_training_protocol_revisions_analysis_session_id_analysis_sessions_id_fk" FOREIGN KEY ("analysis_session_id") REFERENCES "public"."analysis_sessions"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "training_protocol_transfer_records" ADD CONSTRAINT "training_protocol_transfer_records_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "training_protocol_transfer_records" ADD CONSTRAINT "training_protocol_transfer_records_analysis_session_id_analysis_sessions_id_fk" FOREIGN KEY ("analysis_session_id") REFERENCES "public"."analysis_sessions"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "complete_training_protocol_revisions_user_session_idx" ON "complete_training_protocol_revisions" USING btree ("user_id","analysis_session_id");
--> statement-breakpoint
CREATE INDEX "complete_training_protocol_revisions_protocol_idx" ON "complete_training_protocol_revisions" USING btree ("protocol_id");
--> statement-breakpoint
CREATE INDEX "training_protocol_transfer_records_user_session_idx" ON "training_protocol_transfer_records" USING btree ("user_id","analysis_session_id");
--> statement-breakpoint
CREATE INDEX "training_protocol_transfer_records_protocol_idx" ON "training_protocol_transfer_records" USING btree ("protocol_id");
