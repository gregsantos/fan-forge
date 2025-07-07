-- Rename ip_id to ip_kit_id for clarity
ALTER TABLE "submissions" RENAME COLUMN "ip_id" TO "ip_kit_id";

-- Update the index name to match
DROP INDEX IF EXISTS "submissions_ip_id_idx";
CREATE INDEX "submissions_ip_kit_id_idx" ON "submissions" ("ip_kit_id");

-- Update comments for clarity
COMMENT ON COLUMN "submissions"."ip_kit_id" IS 'Reference to the IP Kit used for this submission (foreign key to ip_kits.id)';
COMMENT ON COLUMN "submissions"."story_protocol_ip_id" IS 'Story Protocol blockchain IP Asset ID (0x address from Story Protocol registration)'; 