-- Add Story Protocol IP Asset ID field to submissions table
ALTER TABLE "submissions" ADD COLUMN "story_protocol_ip_id" text;

-- Add index for the new field
CREATE INDEX "submissions_story_protocol_ip_id_idx" ON "submissions" ("story_protocol_ip_id");

-- Add comment to clarify the field purpose
COMMENT ON COLUMN "submissions"."story_protocol_ip_id" IS 'Story Protocol blockchain IP Asset ID (0x address)';
COMMENT ON COLUMN "submissions"."ip_id" IS 'Reference to IP Kit used for this submission'; 