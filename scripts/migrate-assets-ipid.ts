import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { assets, assetIpKits } from '@/db/schema'
import { eq } from 'drizzle-orm'
import * as dotenv from "dotenv"

// Load environment variables
dotenv.config({ path: ".env.local" })

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required')
}

const client = postgres(process.env.DATABASE_URL, { prepare: false })
const db = drizzle(client, { schema: { assets, assetIpKits } })

async function migrateAssetsIpId() {
  console.log('Starting asset IP ID migration...')
  
  const sampleIpId = "0xD52e1555a7Df6832300032fDc64dAf9a431b6C9f"
  
  try {
    // 1. First, manually add the columns if they don't exist
    console.log('Adding columns if they don\'t exist...')
    
    try {
      await client`ALTER TABLE assets ADD COLUMN IF NOT EXISTS ip_id text`
      console.log('✓ Added ip_id column to assets')
    } catch (error) {
      console.log('ip_id column may already exist:', error instanceof Error ? error.message : String(error))
    }
    
    try {
      await client`ALTER TABLE submissions ADD COLUMN IF NOT EXISTS used_asset_ids jsonb DEFAULT '[]'::jsonb`
      console.log('✓ Added used_asset_ids column to submissions')
    } catch (error) {
      console.log('used_asset_ids column may already exist:', error instanceof Error ? error.message : String(error))
    }
    
    try {
      await client`
        CREATE TABLE IF NOT EXISTS asset_ip_kits (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
          asset_id uuid NOT NULL,
          ip_kit_id uuid NOT NULL,
          created_at timestamp DEFAULT now() NOT NULL,
          CONSTRAINT asset_ip_kits_asset_id_ip_kit_id_unique UNIQUE(asset_id, ip_kit_id)
        )
      `
      console.log('✓ Created asset_ip_kits table')
    } catch (error) {
      console.log('asset_ip_kits table may already exist:', error instanceof Error ? error.message : String(error))
    }
    
    try {
      await client`ALTER TABLE asset_ip_kits ADD CONSTRAINT IF NOT EXISTS asset_ip_kits_asset_id_assets_id_fk FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE cascade`
      await client`ALTER TABLE asset_ip_kits ADD CONSTRAINT IF NOT EXISTS asset_ip_kits_ip_kit_id_ip_kits_id_fk FOREIGN KEY (ip_kit_id) REFERENCES ip_kits(id) ON DELETE cascade`
      console.log('✓ Added foreign key constraints')
    } catch (error) {
      console.log('Foreign key constraints may already exist:', error instanceof Error ? error.message : String(error))
    }
    
    try {
      await client`CREATE INDEX IF NOT EXISTS asset_ip_kits_asset_id_idx ON asset_ip_kits USING btree (asset_id)`
      await client`CREATE INDEX IF NOT EXISTS asset_ip_kits_ip_kit_id_idx ON asset_ip_kits USING btree (ip_kit_id)`
      await client`CREATE INDEX IF NOT EXISTS assets_ip_id_idx ON assets USING btree (ip_id)`
      console.log('✓ Created indexes')
    } catch (error) {
      console.log('Indexes may already exist:', error instanceof Error ? error.message : String(error))
    }
    
    // 2. Update existing assets with sample IP ID
    console.log('Updating existing assets with sample IP ID...')
    
    const result = await client`
      UPDATE assets 
      SET ip_id = ${sampleIpId} 
      WHERE ip_id IS NULL
    `
    
    console.log(`✓ Updated ${result.count} assets with sample IP ID: ${sampleIpId}`)
    
    // 3. Populate asset_ip_kits junction table with existing relationships
    console.log('Populating asset_ip_kits junction table...')
    
    const insertResult = await client`
      INSERT INTO asset_ip_kits (asset_id, ip_kit_id, created_at)
      SELECT id, ip_kit_id, created_at 
      FROM assets
      ON CONFLICT (asset_id, ip_kit_id) DO NOTHING
    `
    
    console.log(`✓ Created ${insertResult.count} asset-ipkit relationships`)
    
    console.log('Migration completed successfully!')
    
  } catch (error) {
    console.error('Migration failed:', error)
    throw error
  } finally {
    await client.end()
  }
}

// Run migration
migrateAssetsIpId().catch(console.error)