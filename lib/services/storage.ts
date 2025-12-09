import { createClient } from '@/utils/supabase/client'

export interface UploadResult {
  url: string
  path: string
  id: string
}

export interface AssetMetadata {
  width: number
  height: number
  fileSize: number
  mimeType: string
  colorPalette?: string[]
}

export interface FileValidationOptions {
  maxSizeBytes: number
  allowedTypes: string[]
}

// Default validation options
const DEFAULT_VALIDATION: FileValidationOptions = {
  maxSizeBytes: parseInt(process.env.NEXT_PUBLIC_MAX_FILE_SIZE || '10485760'), // 10MB
  allowedTypes: (process.env.NEXT_PUBLIC_ALLOWED_FILE_TYPES || 'image/jpeg,image/png,image/svg+xml').split(',')
}

export const storageService = {
  /**
   * Validate a file before upload
   */
  validateFile(file: File, options: FileValidationOptions = DEFAULT_VALIDATION): string | null {
    // Check file size
    if (file.size > options.maxSizeBytes) {
      const maxSizeMB = Math.round(options.maxSizeBytes / 1024 / 1024)
      return `File size must be less than ${maxSizeMB}MB`
    }

    // Check file type
    if (!options.allowedTypes.includes(file.type)) {
      return `File type ${file.type} is not allowed. Allowed types: ${options.allowedTypes.join(', ')}`
    }

    return null
  },

  /**
   * Get file metadata (dimensions, etc.)
   */
  async getFileMetadata(file: File): Promise<AssetMetadata> {
    return new Promise((resolve, reject) => {
      if (!file.type.startsWith('image/')) {
        resolve({
          width: 0,
          height: 0,
          fileSize: file.size,
          mimeType: file.type
        })
        return
      }

      const img = new Image()
      img.onload = () => {
        resolve({
          width: img.width,
          height: img.height,
          fileSize: file.size,
          mimeType: file.type
        })
      }
      img.onerror = () => reject(new Error('Failed to load image'))
      img.src = URL.createObjectURL(file)
    })
  },

  /**
   * Generate a unique file path
   */
  generateFilePath(originalFilename: string, ipKitId: string | null, category: string): string {
    const timestamp = Date.now()
    const randomId = Math.random().toString(36).substring(2)
    const extension = originalFilename.split('.').pop()
    
    if (ipKitId) {
      return `ip-kits/${ipKitId}/${category}/${timestamp}-${randomId}.${extension}`
    } else {
      return `global-assets/${category}/${timestamp}-${randomId}.${extension}`
    }
  },

  /**
   * Upload a file to Supabase Storage
   */
  async uploadFile(file: File, path: string): Promise<UploadResult> {
    const supabase = createClient()

    // Validate file first
    const validationError = this.validateFile(file)
    if (validationError) {
      throw new Error(validationError)
    }

    const { data, error } = await supabase.storage
      .from('assets')
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (error) {
      throw new Error(`Upload failed: ${error.message}`)
    }

    // Get the public URL
    const { data: { publicUrl } } = supabase.storage
      .from('assets')
      .getPublicUrl(data.path)

    return {
      url: publicUrl,
      path: data.path,
      id: data.id || data.path
    }
  },

  /**
   * Generate thumbnail for images
   */
  async generateThumbnail(file: File, maxWidth: number = 300, maxHeight: number = 300): Promise<File> {
    return new Promise((resolve, reject) => {
      if (!file.type.startsWith('image/')) {
        resolve(file) // Return original file if not an image
        return
      }

      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const img = new Image()

      img.onload = () => {
        // Calculate new dimensions
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

        // Draw and compress
        ctx?.drawImage(img, 0, 0, width, height)
        
        canvas.toBlob((blob) => {
          if (blob) {
            const thumbnailFile = new File([blob], `thumb_${file.name}`, {
              type: 'image/jpeg',
              lastModified: Date.now()
            })
            resolve(thumbnailFile)
          } else {
            reject(new Error('Failed to generate thumbnail'))
          }
        }, 'image/jpeg', 0.8)
      }

      img.onerror = () => reject(new Error('Failed to load image for thumbnail'))
      img.src = URL.createObjectURL(file)
    })
  },

  /**
   * Upload file with thumbnail generation
   */
  async uploadAsset(file: File, ipKitId: string | null, category: string): Promise<{
    asset: UploadResult
    thumbnail?: UploadResult
    metadata: AssetMetadata
  }> {
    // Generate paths
    const assetPath = this.generateFilePath(file.name, ipKitId, category)
    const thumbnailPath = this.generateFilePath(`thumb_${file.name}`, ipKitId, `${category}/thumbnails`)

    // Get metadata
    const metadata = await this.getFileMetadata(file)

    // Upload main asset
    const asset = await this.uploadFile(file, assetPath)

    // Generate and upload thumbnail for images
    let thumbnail: UploadResult | undefined
    if (file.type.startsWith('image/')) {
      try {
        const thumbnailFile = await this.generateThumbnail(file)
        thumbnail = await this.uploadFile(thumbnailFile, thumbnailPath)
      } catch (error) {
        console.warn('Failed to generate thumbnail:', error)
        // Continue without thumbnail if generation fails
      }
    }

    return { asset, thumbnail, metadata }
  },

  /**
   * Delete a file from storage
   */
  async deleteFile(path: string): Promise<void> {
    const supabase = createClient()

    const { error } = await supabase.storage
      .from('assets')
      .remove([path])

    if (error) {
      throw new Error(`Delete failed: ${error.message}`)
    }
  },

  /**
   * Get a signed URL for private assets
   */
  async getSignedUrl(path: string, expiresIn: number = 3600): Promise<string> {
    const supabase = createClient()

    const { data, error } = await supabase.storage
      .from('assets')
      .createSignedUrl(path, expiresIn)

    if (error) {
      throw new Error(`Failed to create signed URL: ${error.message}`)
    }

    return data.signedUrl
  },

  /**
   * List files in a directory
   */
  async listFiles(path: string): Promise<Array<{ name: string; size: number; lastModified: string }>> {
    const supabase = createClient()

    const { data, error } = await supabase.storage
      .from('assets')
      .list(path)

    if (error) {
      throw new Error(`Failed to list files: ${error.message}`)
    }

    return data.map(file => ({
      name: file.name,
      size: file.metadata?.size || 0,
      lastModified: file.updated_at || file.created_at
    }))
  }
}