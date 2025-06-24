CREATE TABLE "submission_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"submission_id" uuid NOT NULL,
	"asset_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "submission_assets_submission_id_asset_id_unique" UNIQUE("submission_id","asset_id")
);
--> statement-breakpoint
ALTER TABLE "assets" ALTER COLUMN "ip_kit_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN "image_url" text;--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN "thumbnail_url" text;--> statement-breakpoint
ALTER TABLE "submission_assets" ADD CONSTRAINT "submission_assets_submission_id_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."submissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submission_assets" ADD CONSTRAINT "submission_assets_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "submission_assets_submission_id_idx" ON "submission_assets" USING btree ("submission_id");--> statement-breakpoint
CREATE INDEX "submission_assets_asset_id_idx" ON "submission_assets" USING btree ("asset_id");