ALTER TABLE "analysis_sessions" ADD COLUMN "patch_version" text DEFAULT 'legacy-unknown';
UPDATE "analysis_sessions"
SET "patch_version" = 'legacy-unknown'
WHERE "patch_version" IS NULL;
ALTER TABLE "analysis_sessions" ALTER COLUMN "patch_version" SET NOT NULL;
ALTER TABLE "analysis_sessions" ALTER COLUMN "patch_version" DROP DEFAULT;
