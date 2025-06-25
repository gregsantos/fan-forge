"use client"

import { useState, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { assetStorageService } from "@/lib/services/asset-storage"
import { Upload, X, FileImage, AlertCircle, CheckCircle, File } from "lucide-react"
import { cn } from "@/lib/utils"

export interface UploadedFile {
  id: string
  file: File
  url?: string
  thumbnailUrl?: string
  ipId?: string
  status: 'pending' | 'uploading' | 'success' | 'error'
  progress: number
  error?: string
  metadata?: {
    width: number
    height: number
    fileSize: number
    mimeType: string
  }
}

interface FileUploadProps {
  onFilesUploaded: (files: UploadedFile[]) => void
  onFilesRemoved: (fileIds: string[]) => void
  ipKitId: string | null
  campaignId?: string
  category: string
  maxFiles?: number
  className?: string
  disabled?: boolean
  showIpIdInput?: boolean
}

export function FileUpload({
  onFilesUploaded,
  onFilesRemoved,
  ipKitId,
  campaignId,
  category,
  maxFiles = 10,
  className,
  disabled = false,
  showIpIdInput = false
}: FileUploadProps) {
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [isDragOver, setIsDragOver] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [ipId, setIpId] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const createUploadedFile = (file: File): UploadedFile => ({
    id: Math.random().toString(36).substring(2),
    file,
    ipId: ipId.trim() || undefined,
    status: 'pending',
    progress: 0
  })

  const updateFile = useCallback((id: string, updates: Partial<UploadedFile>) => {
    setFiles(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f))
  }, [])

  const removeFile = useCallback((id: string) => {
    setFiles(prev => {
      const newFiles = prev.filter(f => f.id !== id)
      onFilesRemoved([id])
      return newFiles
    })
  }, [onFilesRemoved])

  const handleFiles = useCallback(async (fileList: FileList) => {
    if (disabled || isUploading) return

    const newFiles = Array.from(fileList)
    
    // Check if adding these files would exceed the limit
    if (files.length + newFiles.length > maxFiles) {
      alert(`Maximum ${maxFiles} files allowed`)
      return
    }

    // Create upload file objects
    const uploadFiles = newFiles.map(createUploadedFile)
    setFiles(prev => [...prev, ...uploadFiles])

    setIsUploading(true)
    const successfulUploads: UploadedFile[] = []

    // Upload files one by one
    for (const uploadFile of uploadFiles) {
      try {
        updateFile(uploadFile.id, { status: 'uploading', progress: 0 })

        // Upload the asset using assetStorageService
        const result = await assetStorageService.uploadAsset(uploadFile.file, {
          category: category as any, // Cast to expected enum type
          ipKitId: ipKitId || undefined,
          campaignId: campaignId,
          ipId: ipId.trim() || undefined,
          onProgress: (progress) => {
            updateFile(uploadFile.id, { 
              progress: progress.progress,
              status: progress.stage === 'error' ? 'error' : 'uploading'
            })
          }
        })
        
        const updatedFile = {
          ...uploadFile,
          status: 'success' as const,
          progress: 100,
          url: result.assetUrl,
          thumbnailUrl: result.thumbnailUrl,
          metadata: result.metadata
        }
        
        updateFile(uploadFile.id, updatedFile)
        successfulUploads.push(updatedFile)

      } catch (error) {
        console.error('Upload error:', error)
        updateFile(uploadFile.id, {
          status: 'error',
          error: error instanceof Error ? error.message : 'Upload failed'
        })
      }
    }

    setIsUploading(false)

    // Notify parent of successful uploads
    if (successfulUploads.length > 0) {
      onFilesUploaded(successfulUploads)
    }
  }, [files, disabled, isUploading, maxFiles, ipKitId, campaignId, category, updateFile, onFilesUploaded, ipId])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    if (!disabled) {
      setIsDragOver(true)
    }
  }, [disabled])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    
    if (!disabled && e.dataTransfer.files) {
      handleFiles(e.dataTransfer.files)
    }
  }, [disabled, handleFiles])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files)
    }
  }, [handleFiles])

  const openFileDialog = () => {
    if (!disabled) {
      fileInputRef.current?.click()
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) {
      return <FileImage className="h-6 w-6" />
    }
    return <File className="h-6 w-6" />
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* IP ID Input (optional) */}
      {showIpIdInput && (
        <div className="space-y-2">
          <Label htmlFor="ipId-fileupload">IP Address (Optional)</Label>
          <Input
            id="ipId-fileupload"
            type="text"
            placeholder="e.g., 0xD52e1555a7Df6832300032fDc64dAf9a431b6C9f"
            value={ipId}
            onChange={(e) => setIpId(e.target.value)}
            disabled={disabled}
            className="font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground">
            Optional blockchain address for IP identification
          </p>
        </div>
      )}

      {/* Drop Zone */}
      <Card
        className={cn(
          "border-2 border-dashed transition-colors cursor-pointer",
          isDragOver && !disabled && "border-primary bg-primary/5",
          disabled && "opacity-50 cursor-not-allowed"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={openFileDialog}
      >
        <CardContent className="flex flex-col items-center justify-center py-8 text-center">
          <Upload className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg font-medium mb-2">
            {isDragOver ? "Drop files here" : "Upload assets"}
          </p>
          <p className="text-sm text-muted-foreground mb-4">
            Drag and drop files here, or click to browse
          </p>
          <Button variant="outline" disabled={disabled}>
            Select Files
          </Button>
          <p className="text-xs text-muted-foreground mt-2">
            Supports: JPEG, PNG, SVG • Max size: 10MB • Max files: {maxFiles}
          </p>
        </CardContent>
      </Card>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={process.env.NEXT_PUBLIC_ALLOWED_FILE_TYPES || 'image/jpeg,image/png,image/svg+xml'}
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium">Files ({files.length})</h3>
          {files.map((uploadFile) => (
            <Card key={uploadFile.id} className="p-4">
              <div className="flex items-center space-x-4">
                {/* File Icon/Thumbnail */}
                <div className="flex-shrink-0">
                  {uploadFile.thumbnailUrl ? (
                    <img
                      src={uploadFile.thumbnailUrl}
                      alt={uploadFile.file.name}
                      className="h-12 w-12 object-cover rounded"
                    />
                  ) : (
                    <div className="h-12 w-12 bg-muted rounded flex items-center justify-center">
                      {getFileIcon(uploadFile.file.type)}
                    </div>
                  )}
                </div>

                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{uploadFile.file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(uploadFile.file.size)}
                    {uploadFile.metadata && (
                      <span> • {uploadFile.metadata.width}×{uploadFile.metadata.height}</span>
                    )}
                  </p>
                  
                  {/* Progress Bar */}
                  {uploadFile.status === 'uploading' && (
                    <Progress value={uploadFile.progress} className="mt-2" />
                  )}
                  
                  {/* Error Message */}
                  {uploadFile.status === 'error' && uploadFile.error && (
                    <p className="text-xs text-destructive mt-1">{uploadFile.error}</p>
                  )}
                </div>

                {/* Status & Actions */}
                <div className="flex items-center space-x-2">
                  {uploadFile.status === 'pending' && (
                    <Badge variant="secondary">Pending</Badge>
                  )}
                  {uploadFile.status === 'uploading' && (
                    <Badge variant="secondary">Uploading...</Badge>
                  )}
                  {uploadFile.status === 'success' && (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  )}
                  {uploadFile.status === 'error' && (
                    <AlertCircle className="h-5 w-5 text-destructive" />
                  )}
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation()
                      removeFile(uploadFile.id)
                    }}
                    disabled={uploadFile.status === 'uploading'}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}