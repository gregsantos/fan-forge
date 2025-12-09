import { createClient } from '@/utils/supabase/client'

export interface UploadResult {
  url: string
  path: string
  id: string
}

export interface SubmissionUploadProgress {
  stage: 'preparing' | 'uploading_artwork' | 'uploading_thumbnail' | 'complete' | 'error'
  progress: number // 0-100
  message: string
}

export const submissionStorageService = {
  /**
   * Generate a unique file path for submission artwork or thumbnail
   */
  generateSubmissionPath(userId: string, submissionId: string, type: 'artwork' | 'thumbnail', format: 'png' | 'jpeg' = 'png'): string {
    const timestamp = Date.now()
    const extension = format === 'jpeg' ? 'jpg' : 'png'
    return `${userId}/submissions/${submissionId}/${type}_${timestamp}.${extension}`
  },

  /**
   * Upload a blob to Supabase Storage for submissions
   */
  async uploadBlob(blob: Blob, path: string): Promise<UploadResult> {
    const supabase = createClient()

    // Validate blob size (max 50MB for submissions)
    const maxSize = 50 * 1024 * 1024 // 50MB
    if (blob.size > maxSize) {
      throw new Error(`File size must be less than 50MB. Current size: ${Math.round(blob.size / 1024 / 1024)}MB`)
    }

    const { data, error } = await supabase.storage
      .from('submissions')
      .upload(path, blob, {
        cacheControl: '3600',
        upsert: true // Allow overwriting for resubmissions
      })

    if (error) {
      throw new Error(`Upload failed: ${error.message}`)
    }

    // Get the public URL
    const { data: { publicUrl } } = supabase.storage
      .from('submissions')
      .getPublicUrl(data.path)

    return {
      url: publicUrl,
      path: data.path,
      id: data.id || data.path
    }
  },

  /**
   * Generate a thumbnail from a canvas blob
   */
  async generateThumbnail(originalBlob: Blob, maxWidth: number = 400, maxHeight: number = 300): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const img = new Image()

      img.onload = () => {
        // Calculate new dimensions maintaining aspect ratio
        let { width, height } = img
        
        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width
            width = maxWidth
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height
            height = maxHeight
          }
        }

        canvas.width = width
        canvas.height = height

        // Draw and compress for thumbnail
        ctx?.drawImage(img, 0, 0, width, height)
        
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob)
          } else {
            reject(new Error('Failed to generate thumbnail'))
          }
        }, 'image/jpeg', 0.8) // Use JPEG with 80% quality for thumbnails
      }

      img.onerror = () => reject(new Error('Failed to load image for thumbnail'))
      img.src = URL.createObjectURL(originalBlob)
    })
  },

  /**
   * Upload submission artwork and thumbnail with progress tracking
   */
  async uploadSubmissionArtwork(
    artworkBlob: Blob, 
    userId: string, 
    submissionId: string,
    onProgress?: (progress: SubmissionUploadProgress) => void
  ): Promise<{ artworkUrl: string, thumbnailUrl: string }> {
    try {
      // Stage 1: Prepare upload
      onProgress?.({
        stage: 'preparing',
        progress: 10,
        message: 'Preparing artwork upload...'
      })

      // Generate paths
      const artworkPath = this.generateSubmissionPath(userId, submissionId, 'artwork', 'png')
      const thumbnailPath = this.generateSubmissionPath(userId, submissionId, 'thumbnail', 'jpeg')

      // Stage 2: Generate thumbnail
      onProgress?.({
        stage: 'preparing',
        progress: 20,
        message: 'Generating thumbnail...'
      })

      const thumbnailBlob = await this.generateThumbnail(artworkBlob)

      // Stage 3: Upload artwork and thumbnail concurrently
      onProgress?.({
        stage: 'uploading_artwork',
        progress: 40,
        message: 'Uploading artwork...'
      })

      const [artworkResult, thumbnailResult] = await Promise.all([
        this.uploadBlob(artworkBlob, artworkPath),
        this.uploadBlob(thumbnailBlob, thumbnailPath)
      ])

      onProgress?.({
        stage: 'complete',
        progress: 100,
        message: 'Upload complete!'
      })

      return {
        artworkUrl: artworkResult.url,
        thumbnailUrl: thumbnailResult.url
      }

    } catch (error) {
      onProgress?.({
        stage: 'error',
        progress: 0,
        message: error instanceof Error ? error.message : 'Upload failed'
      })
      throw error
    }
  },

  /**
   * Upload submission artwork with retry mechanism
   */
  async uploadSubmissionArtworkWithRetry(
    artworkBlob: Blob,
    userId: string,
    submissionId: string,
    onProgress?: (progress: SubmissionUploadProgress) => void,
    maxRetries: number = 3
  ): Promise<{ artworkUrl: string, thumbnailUrl: string }> {
    let lastError: Error | null = null

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 1) {
          onProgress?.({
            stage: 'preparing',
            progress: 5,
            message: `Retry attempt ${attempt}/${maxRetries}...`
          })
          // Wait before retry with exponential backoff
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt - 1) * 1000))
        }

        return await this.uploadSubmissionArtwork(artworkBlob, userId, submissionId, onProgress)
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Upload failed')
        
        if (attempt === maxRetries) {
          onProgress?.({
            stage: 'error',
            progress: 0,
            message: `Upload failed after ${maxRetries} attempts: ${lastError.message}`
          })
          throw lastError
        }
      }
    }

    throw lastError || new Error('Upload failed')
  },

  /**
   * Delete submission files from storage
   */
  async deleteSubmissionFiles(userId: string, submissionId: string): Promise<void> {
    const supabase = createClient()

    // List all files in the submission folder
    const { data: files, error: listError } = await supabase.storage
      .from('submissions')
      .list(`${userId}/submissions/${submissionId}`)

    if (listError) {
      console.warn('Failed to list submission files for deletion:', listError)
      return
    }

    if (files && files.length > 0) {
      const filePaths = files.map(file => `${userId}/submissions/${submissionId}/${file.name}`)
      
      const { error: deleteError } = await supabase.storage
        .from('submissions')
        .remove(filePaths)

      if (deleteError) {
        console.warn('Failed to delete submission files:', deleteError)
      }
    }
  },

  /**
   * Get storage usage for a user's submissions
   */
  async getSubmissionStorageUsage(userId: string): Promise<{ totalSize: number, fileCount: number }> {
    const supabase = createClient()

    const { data: files, error } = await supabase.storage
      .from('submissions')
      .list(`${userId}/submissions`, { 
        limit: 1000,
        sortBy: { column: 'created_at', order: 'desc' }
      })

    if (error) {
      throw new Error(`Failed to get storage usage: ${error.message}`)
    }

    const totalSize = files?.reduce((sum, file) => sum + (file.metadata?.size || 0), 0) || 0
    const fileCount = files?.length || 0

    return { totalSize, fileCount }
  }
}