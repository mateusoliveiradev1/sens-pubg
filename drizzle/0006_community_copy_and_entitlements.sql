CREATE TABLE "community_post_copy_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_id" uuid NOT NULL,
	"copied_by_user_id" uuid,
	"copy_target" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feature_entitlements" (
	"key" text PRIMARY KEY NOT NULL,
	"description" text NOT NULL,
	"status" text DEFAULT 'inactive' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_entitlements" (
	"user_id" uuid NOT NULL,
	"entitlement_key" text NOT NULL,
	"source" text NOT NULL,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_entitlements_user_id_entitlement_key_pk" PRIMARY KEY("user_id","entitlement_key")
);
--> statement-breakpoint
ALTER TABLE "community_post_copy_events" ADD CONSTRAINT "community_post_copy_events_post_id_community_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."community_posts"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "community_post_copy_events" ADD CONSTRAINT "community_post_copy_events_copied_by_user_id_users_id_fk" FOREIGN KEY ("copied_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "user_entitlements" ADD CONSTRAINT "user_entitlements_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "user_entitlements" ADD CONSTRAINT "user_entitlements_entitlement_key_feature_entitlements_key_fk" FOREIGN KEY ("entitlement_key") REFERENCES "public"."feature_entitlements"("key") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "community_post_copy_events_post_id_created_at_idx" ON "community_post_copy_events" USING btree ("post_id","created_at");
