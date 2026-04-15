CREATE TABLE "weapon_patch_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"weapon_id" uuid NOT NULL,
	"patch_version" text NOT NULL,
	"lifecycle_status" text DEFAULT 'active' NOT NULL,
	"base_vertical_recoil" real NOT NULL,
	"base_horizontal_rng" real NOT NULL,
	"fire_rate_ms" integer NOT NULL,
	"multipliers" jsonb DEFAULT '{}' NOT NULL,
	"canonical_profile" jsonb,
	"attachments" jsonb DEFAULT '[]' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "weapon_registry" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"weapon_id" text NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "weapon_registry_weapon_id_unique" UNIQUE("weapon_id")
);
--> statement-breakpoint
ALTER TABLE "weapon_patch_profiles" ADD CONSTRAINT "weapon_patch_profiles_weapon_id_weapon_registry_id_fk" FOREIGN KEY ("weapon_id") REFERENCES "public"."weapon_registry"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "weapon_patch_profiles_weapon_patch_uidx" ON "weapon_patch_profiles" USING btree ("weapon_id","patch_version");