# Supabase Storage Setup for FanForge Canvas Artwork Upload

This guide walks you through setting up the required Supabase Storage buckets and policies for the canvas artwork upload functionality.

## Required Storage Buckets

### 1. Create "submissions" Bucket

#### Option A: Using Supabase Dashboard (Recommended)

1. **Navigate to Storage in Supabase Dashboard:**
   - Go to your Supabase project dashboard
   - Click on "Storage" in the left sidebar
   - Click "Create a new bucket"

2. **Create the submissions bucket:**
   - **Name**: `submissions`
   - **Public**: ✅ `true` (for direct artwork access)
   - **File size limit**: `50MB` (to accommodate high-res artwork)
   - **Allowed MIME types**: `image/png,image/jpeg,image/webp`

3. **Set up Row Level Security (RLS) policies:**
   
   Go to the SQL Editor in your Supabase dashboard and run these queries:

   ```sql
   -- Enable RLS on the storage.objects table (if not already enabled)
   ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

   -- Policy 1: Allow authenticated users to upload to their own submission folders
   CREATE POLICY "Users can upload submission artwork" ON storage.objects
   FOR INSERT WITH CHECK (
     bucket_id = 'submissions' 
     AND auth.role() = 'authenticated'
     AND (storage.foldername(name))[1] = auth.uid()::text
   );

   -- Policy 2: Allow public read access to all submission artwork
   CREATE POLICY "Public can view submission artwork" ON storage.objects
   FOR SELECT USING (bucket_id = 'submissions');

   -- Policy 3: Allow users to update their own submissions
   CREATE POLICY "Users can update own submission artwork" ON storage.objects
   FOR UPDATE USING (
     bucket_id = 'submissions' 
     AND auth.role() = 'authenticated'
     AND (storage.foldername(name))[1] = auth.uid()::text
   );

   -- Policy 4: Allow users to delete their own submissions
   CREATE POLICY "Users can delete own submission artwork" ON storage.objects
   FOR DELETE USING (
     bucket_id = 'submissions' 
     AND auth.role() = 'authenticated'
     AND (storage.foldername(name))[1] = auth.uid()::text
   );
   ```

#### Option B: Using Supabase CLI

1. **Create the bucket:**
   ```bash
   supabase storage create submissions --public
   ```

2. **Apply RLS policies:**
   
   Create a file `supabase/migrations/add_submissions_storage_policies.sql`:
   ```sql
   -- Enable RLS on the storage.objects table
   ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

   -- Storage policies for submissions bucket
   CREATE POLICY "Users can upload submission artwork" ON storage.objects
   FOR INSERT WITH CHECK (
     bucket_id = 'submissions' 
     AND auth.role() = 'authenticated'
     AND (storage.foldername(name))[1] = auth.uid()::text
   );

   CREATE POLICY "Public can view submission artwork" ON storage.objects
   FOR SELECT USING (bucket_id = 'submissions');

   CREATE POLICY "Users can update own submission artwork" ON storage.objects
   FOR UPDATE USING (
     bucket_id = 'submissions' 
     AND auth.role() = 'authenticated'
     AND (storage.foldername(name))[1] = auth.uid()::text
   );

   CREATE POLICY "Users can delete own submission artwork" ON storage.objects
   FOR DELETE USING (
     bucket_id = 'submissions' 
     AND auth.role() = 'authenticated'
     AND (storage.foldername(name))[1] = auth.uid()::text
   );
   ```

   Then run:
   ```bash
   supabase db push
   ```

#### Option C: Using SQL/API directly

```sql
-- Create bucket via SQL
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'submissions', 
  'submissions', 
  true, 
  52428800, -- 50MB in bytes
  ARRAY['image/png', 'image/jpeg', 'image/webp']
);

-- Apply the RLS policies (same as above)
```

### 2. Create "assets" Bucket for IP Kit Assets

The assets bucket stores all IP Kit assets that are used in campaigns and the creation canvas.

#### Option A: Using Supabase Dashboard (Recommended)

1. **Navigate to Storage in Supabase Dashboard:**
   - Go to your Supabase project dashboard
   - Click on "Storage" in the left sidebar
   - Click "Create a new bucket"

2. **Create the assets bucket:**
   - **Name**: `assets`
   - **Public**: ✅ `true` (for direct asset access in campaigns)
   - **File size limit**: `10MB` (for IP Kit assets)
   - **Allowed MIME types**: `image/jpeg,image/png,image/svg+xml,image/webp`

3. **Set up Row Level Security (RLS) policies:**
   
   Go to the SQL Editor in your Supabase dashboard and run these queries:

   ```sql
   -- Policy 1: Allow authenticated users to upload assets to IP Kit folders
   CREATE POLICY "Brand admins can upload assets" ON storage.objects
   FOR INSERT WITH CHECK (
     bucket_id = 'assets' 
     AND auth.role() = 'authenticated'
     AND (storage.foldername(name))[1] = 'ip-kits'
   );

   -- Policy 2: Allow public read access to all assets
   CREATE POLICY "Public can view assets" ON storage.objects
   FOR SELECT USING (bucket_id = 'assets');

   -- Policy 3: Allow brand admins to update their assets
   CREATE POLICY "Brand admins can update assets" ON storage.objects
   FOR UPDATE USING (
     bucket_id = 'assets' 
     AND auth.role() = 'authenticated'
     AND (storage.foldername(name))[1] = 'ip-kits'
   );

   -- Policy 4: Allow brand admins to delete their assets
   CREATE POLICY "Brand admins can delete assets" ON storage.objects
   FOR DELETE USING (
     bucket_id = 'assets' 
     AND auth.role() = 'authenticated'
     AND (storage.foldername(name))[1] = 'ip-kits'
   );
   ```

#### Option B: Using Supabase CLI

1. **Create the bucket:**
   ```bash
   supabase storage create assets --public
   ```

2. **Apply RLS policies:**
   
   Create a file `supabase/migrations/add_assets_storage_policies.sql`:
   ```sql
   -- Storage policies for assets bucket
   CREATE POLICY "Brand admins can upload assets" ON storage.objects
   FOR INSERT WITH CHECK (
     bucket_id = 'assets' 
     AND auth.role() = 'authenticated'
     AND (storage.foldername(name))[1] = 'ip-kits'
   );

   CREATE POLICY "Public can view assets" ON storage.objects
   FOR SELECT USING (bucket_id = 'assets');

   CREATE POLICY "Brand admins can update assets" ON storage.objects
   FOR UPDATE USING (
     bucket_id = 'assets' 
     AND auth.role() = 'authenticated'
     AND (storage.foldername(name))[1] = 'ip-kits'
   );

   CREATE POLICY "Brand admins can delete assets" ON storage.objects
   FOR DELETE USING (
     bucket_id = 'assets' 
     AND auth.role() = 'authenticated'
     AND (storage.foldername(name))[1] = 'ip-kits'
   );
   ```

   Then run:
   ```bash
   supabase db push
   ```

#### Option C: Using SQL/API directly

```sql
-- Create bucket via SQL
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'assets', 
  'assets', 
  true, 
  10485760, -- 10MB in bytes  
  ARRAY['image/jpeg', 'image/png', 'image/svg+xml', 'image/webp']
);

-- Apply the RLS policies (same as above)
```

## Storage Structure

After setup, your storage structure will be:

```
submissions/
├── {user_id}/
│   └── submissions/
│       └── {submission_id}/
│           ├── artwork_{timestamp}.png     # High-res artwork
│           └── thumbnail_{timestamp}.jpg   # Optimized thumbnail
│
assets/
├── ip-kits/
│   └── {ip_kit_id}/
│       ├── characters/
│       │   ├── character_001.png
│       │   └── character_001_thumb.jpg
│       ├── backgrounds/
│       │   ├── bg_forest.jpg
│       │   └── bg_forest_thumb.jpg
│       ├── logos/
│       │   ├── brand_logo.svg
│       │   └── brand_logo_thumb.jpg
│       ├── titles/
│       │   └── game_title.png
│       ├── props/
│       │   └── sword_001.png
│       └── other/
│           └── misc_asset.png
```

## Testing the Setup

1. **Test bucket creation:**
   ```sql
   SELECT * FROM storage.buckets WHERE id IN ('submissions', 'assets');
   ```

2. **Test policies:**
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage';
   ```

3. **Test upload (from your app):**
   - Try uploading a test image through the submission modal
   - Check that files appear in the correct user folder
   - Verify public access to the URLs

## Troubleshooting

### Common Issues:

1. **"RLS policy violation" errors:**
   - Ensure the user is authenticated
   - Check that the file path follows the pattern: `{user_id}/submissions/{submission_id}/`

2. **"Bucket not found" errors:**
   - Verify bucket creation: `SELECT * FROM storage.buckets;`
   - Ensure bucket names match exactly ("submissions", "assets")

3. **"File too large" errors:**
   - Check bucket file size limits
   - Verify the files are under 50MB for submissions, 10MB for assets

4. **CORS issues:**
   - Ensure buckets are marked as `public: true`
   - Check that your domain is in the Supabase CORS settings

### Policy Testing:

Test your policies with these SQL queries (replace `{user_id}` with an actual user ID):

```sql
-- Test if a user can upload to their own folder
SELECT 
  bucket_id = 'submissions' 
  AND auth.uid()::text = '{user_id}'
  AND (string_to_array('{user_id}/submissions/test/artwork.png', '/'))[1] = '{user_id}';

-- Test public read access
SELECT bucket_id = 'submissions';
```

## Environment Variables

Ensure these environment variables are set in your `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_MAX_FILE_SIZE=52428800  # 50MB for submissions
NEXT_PUBLIC_ALLOWED_FILE_TYPES=image/png,image/jpeg,image/webp
```

## Security Notes

- ✅ Users can only upload to folders named with their user ID
- ✅ Public read access allows artwork to be displayed without auth
- ✅ File size and type restrictions prevent abuse
- ✅ Users cannot access other users' private folders
- ✅ Only authenticated users can upload files

After completing this setup, the canvas artwork upload functionality will work correctly with proper security and organization.