CREATE TABLE "asset_ip_kits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"asset_id" uuid NOT NULL,
	"ip_kit_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "asset_ip_kits_asset_id_ip_kit_id_unique" UNIQUE("asset_id","ip_kit_id")
);
--> statement-breakpoint
ALTER TABLE "assets" ADD COLUMN "ip_id" text;--> statement-breakpoint
ALTER TABLE "submissions" ADD COLUMN "used_asset_ids" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "asset_ip_kits" ADD CONSTRAINT "asset_ip_kits_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_ip_kits" ADD CONSTRAINT "asset_ip_kits_ip_kit_id_ip_kits_id_fk" FOREIGN KEY ("ip_kit_id") REFERENCES "public"."ip_kits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "asset_ip_kits_asset_id_idx" ON "asset_ip_kits" USING btree ("asset_id");--> statement-breakpoint
CREATE INDEX "asset_ip_kits_ip_kit_id_idx" ON "asset_ip_kits" USING btree ("ip_kit_id");--> statement-breakpoint
CREATE INDEX "assets_ip_id_idx" ON "assets" USING btree ("ip_id");