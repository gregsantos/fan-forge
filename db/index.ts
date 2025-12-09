import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'
import * as dotenv from "dotenv"

// Load environment variables
dotenv.config({ path: ".env.local" })

// For Drizzle ORM, we use the direct database connection
// This follows the official Drizzle-Supabase integration guide
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required')
}

// Create postgres client for Drizzle ORM
// Using Supabase's direct database URL for server-side operations
const client = postgres(process.env.DATABASE_URL, { prepare: false })
export const db = drizzle(client, { schema })

export type DbClient = typeof db
export * from './schema'
