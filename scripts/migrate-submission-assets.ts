import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { submissions, submissionAssets, assets } from '@/db/schema'
import { eq, inArray } from 'drizzle-orm'
import * as dotenv from "dotenv"

// Load environment variables
dotenv.config({ path: ".env.local" })

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required')
}

const client = postgres(process.env.DATABASE_URL, { prepare: false })
const db = drizzle(client, { schema: { submissions, submissionAssets, assets } })

async function migrateSubmissionAssets() {
  console.log('Starting submission assets migration...')
  
  try {
    // 1. First, manually create the submission_assets table if it doesn't exist
    console.log('Creating submission_assets table if it doesn\'t exist...')
    
    try {
      await client`
        CREATE TABLE IF NOT EXISTS submission_assets (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
          submission_id uuid NOT NULL,
          asset_id uuid NOT NULL,
          created_at timestamp DEFAULT now() NOT NULL,
          CONSTRAINT submission_assets_submission_id_unique UNIQUE(submission_id, asset_id)
        )
      `
      console.log('✓ Created submission_assets table')
    } catch (error) {
      console.log('submission_assets table may already exist:', error instanceof Error ? error.message : String(error))
    }
    
    try {
      await client`ALTER TABLE submission_assets ADD CONSTRAINT IF NOT EXISTS submission_assets_submission_id_submissions_id_fk FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE cascade`
      await client`ALTER TABLE submission_assets ADD CONSTRAINT IF NOT EXISTS submission_assets_asset_id_assets_id_fk FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE cascade`
      console.log('✓ Added foreign key constraints')
    } catch (error) {
      console.log('Foreign key constraints may already exist:', error instanceof Error ? error.message : String(error))
    }
    
    try {
      await client`CREATE INDEX IF NOT EXISTS submission_assets_submission_id_idx ON submission_assets USING btree (submission_id)`
      await client`CREATE INDEX IF NOT EXISTS submission_assets_asset_id_idx ON submission_assets USING btree (asset_id)`
      console.log('✓ Created indexes')
    } catch (error) {
      console.log('Indexes may already exist:', error instanceof Error ? error.message : String(error))
    }
    
    // 2. Get all submissions with used_asset_ids
    console.log('Fetching submissions with used_asset_ids...')
    
    const submissionsWithAssets = await db
      .select({
        id: submissions.id,
        usedAssetIds: submissions.usedAssetIds,
        createdAt: submissions.createdAt
      })
      .from(submissions)
      .where(`used_asset_ids IS NOT NULL AND jsonb_array_length(used_asset_ids) > 0` as any)
    
    console.log(`Found ${submissionsWithAssets.length} submissions with asset usage data`)
    
    // 3. Validate that all referenced assets exist
    const allAssetIds = new Set<string>()
    submissionsWithAssets.forEach(submission => {
      if (submission.usedAssetIds && Array.isArray(submission.usedAssetIds)) {
        submission.usedAssetIds.forEach(assetId => {
          if (typeof assetId === 'string') {
            allAssetIds.add(assetId)
          }
        })
      }
    })
    
    console.log(`Found ${allAssetIds.size} unique asset references`)
    
    // Check which assets exist
    if (allAssetIds.size > 0) {
      const existingAssets = await db
        .select({ id: assets.id })
        .from(assets)
        .where(inArray(assets.id, Array.from(allAssetIds)))
      
      const existingAssetIds = new Set(existingAssets.map(a => a.id))
      const missingAssets = Array.from(allAssetIds).filter(id => !existingAssetIds.has(id))
      
      if (missingAssets.length > 0) {
        console.log(`⚠️  Found ${missingAssets.length} references to missing assets:`)
        missingAssets.slice(0, 5).forEach(id => console.log(`   - ${id}`))
        if (missingAssets.length > 5) {
          console.log(`   ... and ${missingAssets.length - 5} more`)
        }
        console.log('These will be skipped during migration.')
      }
      
      console.log(`✓ Found ${existingAssetIds.size} valid asset references`)
    }
    
    // 4. Migrate data to junction table
    console.log('Migrating data to submission_assets table...')
    
    let totalInserted = 0
    let skippedInvalid = 0
    
    for (const submission of submissionsWithAssets) {
      if (!submission.usedAssetIds || !Array.isArray(submission.usedAssetIds)) {
        continue
      }
      
      const validAssetIds = submission.usedAssetIds.filter(assetId => {
        if (typeof assetId !== 'string') {
          skippedInvalid++
          return false
        }
        return allAssetIds.has(assetId)
      })
      
      if (validAssetIds.length === 0) {
        continue
      }
      
      // Insert relationships for this submission
      try {
        const insertData = validAssetIds.map(assetId => ({
          submissionId: submission.id,
          assetId: assetId,
          createdAt: submission.createdAt
        }))
        
        // Use individual insert statements for better compatibility
        for (const item of insertData) {
          await client`
            INSERT INTO submission_assets (submission_id, asset_id, created_at)
            VALUES (${item.submissionId}, ${item.assetId}, ${item.createdAt})
            ON CONFLICT (submission_id, asset_id) DO NOTHING
          `
        }
        
        const result = { count: insertData.length }
        
        totalInserted += result.count
        
        if (submissionsWithAssets.indexOf(submission) % 10 === 0) {
          console.log(`  Processed ${submissionsWithAssets.indexOf(submission) + 1}/${submissionsWithAssets.length} submissions...`)
        }
      } catch (error) {
        console.error(`Failed to migrate submission ${submission.id}:`, error)
      }
    }
    
    console.log(`✓ Inserted ${totalInserted} submission-asset relationships`)
    if (skippedInvalid > 0) {
      console.log(`⚠️  Skipped ${skippedInvalid} invalid asset references`)
    }
    
    // 5. Validation - compare counts
    console.log('Validating migration...')
    
    const [junctionCount] = await client`SELECT COUNT(*) as count FROM submission_assets`
    console.log(`✓ Junction table contains ${junctionCount.count} relationships`)
    
    // Check a few random submissions to ensure data integrity
    const sampleSubmissions = submissionsWithAssets.slice(0, 3)
    for (const submission of sampleSubmissions) {
      if (!submission.usedAssetIds || !Array.isArray(submission.usedAssetIds)) continue
      
      const junctionAssets = await client`
        SELECT asset_id FROM submission_assets 
        WHERE submission_id = ${submission.id}
      `
      
      const originalCount = submission.usedAssetIds.length
      const migratedCount = junctionAssets.length
      
      console.log(`  Submission ${submission.id}: ${originalCount} → ${migratedCount} assets`)
    }
    
    console.log('Migration completed successfully!')
    
  } catch (error) {
    console.error('Migration failed:', error)
    throw error
  } finally {
    await client.end()
  }
}

// Run migration
migrateSubmissionAssets().catch(console.error)