-- Add ip_id column to submissions table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'submissions' 
        AND column_name = 'ip_id'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE "submissions" ADD COLUMN "ip_id" uuid;
        
        -- Add foreign key constraint
        ALTER TABLE "submissions" ADD CONSTRAINT "submissions_ip_id_ip_kits_id_fk" 
        FOREIGN KEY ("ip_id") REFERENCES "public"."ip_kits"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
        
        -- Create index
        CREATE INDEX "submissions_ip_id_idx" ON "submissions" USING btree ("ip_id");
    END IF;
END $$;