CREATE TABLE "product_feature_entitlements" (
	"key" text PRIMARY KEY NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"tier" text NOT NULL,
	"surface" text NOT NULL,
	"label_key" text NOT NULL,
	"internal_description" text NOT NULL,
	"introduced_phase" text DEFAULT '05' NOT NULL,
	"owner_domain" text NOT NULL,
	"gating_mode" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_checkout_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"internal_price_key" text NOT NULL,
	"status" text DEFAULT 'created' NOT NULL,
	"stripe_checkout_session_id" text,
	"stripe_customer_id" text,
	"idempotency_key" text NOT NULL,
	"environment" text DEFAULT 'test' NOT NULL,
	"metadata" jsonb DEFAULT '{}' NOT NULL,
	"expires_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"stripe_customer_id" text NOT NULL,
	"stripe_subscription_id" text NOT NULL,
	"internal_price_key" text NOT NULL,
	"tier" text DEFAULT 'pro' NOT NULL,
	"billing_status" text NOT NULL,
	"access_state" text NOT NULL,
	"current_period_start" timestamp,
	"current_period_end" timestamp,
	"cancel_at_period_end" boolean DEFAULT false NOT NULL,
	"canceled_at" timestamp,
	"grace_ends_at" timestamp,
	"suspended_at" timestamp,
	"suspension_reason" text,
	"metadata" jsonb DEFAULT '{}' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "processed_stripe_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"stripe_event_id" text NOT NULL,
	"event_type" text NOT NULL,
	"livemode" boolean DEFAULT false NOT NULL,
	"processing_status" text DEFAULT 'received' NOT NULL,
	"checkout_attempt_id" uuid,
	"subscription_id" uuid,
	"payload_hash" text,
	"error_message" text,
	"metadata" jsonb DEFAULT '{}' NOT NULL,
	"received_at" timestamp DEFAULT now() NOT NULL,
	"processed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "product_user_grants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"entitlement_key" text NOT NULL,
	"tier" text DEFAULT 'pro' NOT NULL,
	"source" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"reason_code" text NOT NULL,
	"quota_boost" integer DEFAULT 0 NOT NULL,
	"actor_user_id" uuid,
	"audit_metadata" jsonb DEFAULT '{}' NOT NULL,
	"starts_at" timestamp DEFAULT now() NOT NULL,
	"ends_at" timestamp,
	"revoked_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_quota_ledger" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"analysis_session_id" uuid,
	"analysis_save_attempt_id" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"state" text NOT NULL,
	"reason_code" text NOT NULL,
	"amount" integer DEFAULT 1 NOT NULL,
	"quota_limit" integer NOT NULL,
	"period_start" timestamp NOT NULL,
	"period_end" timestamp NOT NULL,
	"finalized_at" timestamp,
	"voided_at" timestamp,
	"metadata" jsonb DEFAULT '{}' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "monetization_analytics_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"event_type" text NOT NULL,
	"surface" text,
	"feature_key" text,
	"access_state" text,
	"quota_state" text,
	"price_key" text,
	"billing_status" text,
	"reason_code" text,
	"cohort_tag" text,
	"creator_code" text,
	"event_source" text DEFAULT 'server' NOT NULL,
	"metadata" jsonb DEFAULT '{}' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "monetization_flags" (
	"key" text PRIMARY KEY NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"environment" text DEFAULT 'test' NOT NULL,
	"reason" text,
	"updated_by_user_id" uuid,
	"metadata" jsonb DEFAULT '{}' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_support_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"actor_user_id" uuid NOT NULL,
	"category" text NOT NULL,
	"note" text NOT NULL,
	"visibility" text DEFAULT 'internal' NOT NULL,
	"metadata" jsonb DEFAULT '{}' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_billing_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"actor_user_id" uuid,
	"event_type" text NOT NULL,
	"target_type" text NOT NULL,
	"target_id" text,
	"severity" text DEFAULT 'info' NOT NULL,
	"metadata" jsonb DEFAULT '{}' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "product_checkout_attempts" ADD CONSTRAINT "product_checkout_attempts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "product_subscriptions" ADD CONSTRAINT "product_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "processed_stripe_events" ADD CONSTRAINT "processed_stripe_events_checkout_attempt_id_product_checkout_attempts_id_fk" FOREIGN KEY ("checkout_attempt_id") REFERENCES "public"."product_checkout_attempts"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "processed_stripe_events" ADD CONSTRAINT "processed_stripe_events_subscription_id_product_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."product_subscriptions"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "product_user_grants" ADD CONSTRAINT "product_user_grants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "product_user_grants" ADD CONSTRAINT "product_user_grants_entitlement_key_product_feature_entitlements_key_fk" FOREIGN KEY ("entitlement_key") REFERENCES "public"."product_feature_entitlements"("key") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "product_user_grants" ADD CONSTRAINT "product_user_grants_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "product_quota_ledger" ADD CONSTRAINT "product_quota_ledger_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "product_quota_ledger" ADD CONSTRAINT "product_quota_ledger_analysis_session_id_analysis_sessions_id_fk" FOREIGN KEY ("analysis_session_id") REFERENCES "public"."analysis_sessions"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "monetization_analytics_events" ADD CONSTRAINT "monetization_analytics_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "monetization_flags" ADD CONSTRAINT "monetization_flags_updated_by_user_id_users_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "product_support_notes" ADD CONSTRAINT "product_support_notes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "product_support_notes" ADD CONSTRAINT "product_support_notes_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "product_billing_events" ADD CONSTRAINT "product_billing_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "product_billing_events" ADD CONSTRAINT "product_billing_events_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "product_checkout_attempts_session_uidx" ON "product_checkout_attempts" USING btree ("stripe_checkout_session_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "product_checkout_attempts_idempotency_uidx" ON "product_checkout_attempts" USING btree ("idempotency_key");
--> statement-breakpoint
CREATE INDEX "product_checkout_attempts_user_status_idx" ON "product_checkout_attempts" USING btree ("user_id","status");
--> statement-breakpoint
CREATE UNIQUE INDEX "product_subscriptions_subscription_uidx" ON "product_subscriptions" USING btree ("stripe_subscription_id");
--> statement-breakpoint
CREATE INDEX "product_subscriptions_user_status_idx" ON "product_subscriptions" USING btree ("user_id","billing_status");
--> statement-breakpoint
CREATE INDEX "product_subscriptions_customer_idx" ON "product_subscriptions" USING btree ("stripe_customer_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "processed_stripe_events_event_uidx" ON "processed_stripe_events" USING btree ("stripe_event_id");
--> statement-breakpoint
CREATE INDEX "processed_stripe_events_status_idx" ON "processed_stripe_events" USING btree ("processing_status","received_at");
--> statement-breakpoint
CREATE INDEX "product_user_grants_user_status_idx" ON "product_user_grants" USING btree ("user_id","status");
--> statement-breakpoint
CREATE INDEX "product_user_grants_entitlement_idx" ON "product_user_grants" USING btree ("entitlement_key");
--> statement-breakpoint
CREATE INDEX "product_user_grants_actor_idx" ON "product_user_grants" USING btree ("actor_user_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "product_quota_ledger_idempotency_uidx" ON "product_quota_ledger" USING btree ("idempotency_key");
--> statement-breakpoint
CREATE INDEX "product_quota_ledger_user_period_idx" ON "product_quota_ledger" USING btree ("user_id","period_start","period_end");
--> statement-breakpoint
CREATE INDEX "product_quota_ledger_attempt_idx" ON "product_quota_ledger" USING btree ("analysis_save_attempt_id");
--> statement-breakpoint
CREATE INDEX "product_quota_ledger_session_idx" ON "product_quota_ledger" USING btree ("analysis_session_id");
--> statement-breakpoint
CREATE INDEX "monetization_analytics_events_type_created_idx" ON "monetization_analytics_events" USING btree ("event_type","created_at");
--> statement-breakpoint
CREATE INDEX "monetization_analytics_events_user_created_idx" ON "monetization_analytics_events" USING btree ("user_id","created_at");
--> statement-breakpoint
CREATE INDEX "product_support_notes_user_created_idx" ON "product_support_notes" USING btree ("user_id","created_at");
--> statement-breakpoint
CREATE INDEX "product_support_notes_actor_idx" ON "product_support_notes" USING btree ("actor_user_id");
--> statement-breakpoint
CREATE INDEX "product_billing_events_user_created_idx" ON "product_billing_events" USING btree ("user_id","created_at");
--> statement-breakpoint
CREATE INDEX "product_billing_events_type_created_idx" ON "product_billing_events" USING btree ("event_type","created_at");
