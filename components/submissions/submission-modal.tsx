"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { SubmissionSuccess } from "./submission-success"
import { CanvasElement, Asset, SubmissionUploadProgress } from "@/types"
import { exportCanvas } from "@/lib/canvas-export"
import { submissionStorageService } from "@/lib/services/submission-storage"
import { canvasAssetTracker } from "@/lib/canvas-asset-tracker"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { X, Send, AlertCircle, Upload, CheckCircle, Loader2 } from "lucide-react"

interface SubmissionModalProps {
  isOpen: boolean
  onClose: () => void
  campaignId: string
  campaignTitle: string
  canvasElements: CanvasElement[]
  assets: Asset[]
  ipKitId?: string
  onSubmissionSuccess?: (submissionId: string) => void
}

export function SubmissionModal({
  isOpen,
  onClose,
  campaignId,
  campaignTitle,
  canvasElements,
  assets,
  ipKitId,
  onSubmissionSuccess
}: SubmissionModalProps) {
  const [artworkPreview, setArtworkPreview] = useState<string | null>(null)
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false)
  const [submissionId, setSubmissionId] = useState<string | null>(null)
  const [showSuccess, setShowSuccess] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<SubmissionUploadProgress | null>(null)
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [validationWarnings, setValidationWarnings] = useState<string[]>([])
  
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    tags: [] as string[]
  })
  const [newTag, setNewTag] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  const generateArtworkPreview = useCallback(async () => {
    try {
      setIsGeneratingPreview(true)
      
      const blob = await exportCanvas(
        canvasElements,
        assets,
        { width: 800, height: 600 },
        { format: 'png', scale: 1 } // Lower scale for preview
      )
      
      const previewUrl = URL.createObjectURL(blob)
      setArtworkPreview(previewUrl)
    } catch (error) {
      console.error('Failed to generate artwork preview:', error)
    } finally {
      setIsGeneratingPreview(false)
    }
  }, [canvasElements, assets])

  const validateCanvasAndGeneratePreview = useCallback(async () => {
    try {
      // Validate canvas composition
      if (ipKitId) {
        const validation = await canvasAssetTracker.validateCanvasComposition(canvasElements, ipKitId)
        setValidationErrors(validation.errors)
        setValidationWarnings(validation.warnings)
        
        if (!validation.valid) {
          console.warn('Canvas validation failed:', validation.errors)
        }
      }
      
      // Generate preview if canvas has elements
      if (canvasElements.length > 0) {
        generateArtworkPreview()
      }
    } catch (error) {
      console.error('Canvas validation failed:', error)
      setValidationErrors(['Failed to validate canvas composition'])
    }
  }, [canvasElements, ipKitId, generateArtworkPreview])

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required'
    } else if (formData.title.length < 3) {
      newErrors.title = 'Title must be at least 3 characters'
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required'
    } else if (formData.description.length < 10) {
      newErrors.description = 'Description must be at least 10 characters'
    }

    if (canvasElements.length === 0) {
      newErrors.canvas = 'Canvas must contain at least one element'
    }

    if (validationErrors.length > 0) {
      newErrors.validation = validationErrors.join(', ')
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)
    setUploadProgress(null)
    
    try {
      // Generate high-quality artwork for submission
      setUploadProgress({
        stage: 'preparing',
        progress: 5,
        message: 'Generating artwork...'
      })
      
      const artworkBlob = await exportCanvas(
        canvasElements,
        assets,
        { width: 800, height: 600 },
        { format: 'png', scale: 2 } // High quality for submission
      )

      // Get current user ID (you'll need to implement this)
      const userId = await getCurrentUserId()
      if (!userId) {
        throw new Error('User not authenticated')
      }

      // Generate temporary submission ID for upload
      const tempSubmissionId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

      // Upload artwork and thumbnail to Supabase Storage
      const { artworkUrl, thumbnailUrl } = await submissionStorageService.uploadSubmissionArtworkWithRetry(
        artworkBlob,
        userId,
        tempSubmissionId,
        setUploadProgress
      )

      // Generate asset metadata
      const assetMetadata = canvasAssetTracker.generateSubmissionMetadata(canvasElements, ipKitId || '')

      setUploadProgress({
        stage: 'complete',
        progress: 95,
        message: 'Finalizing submission...'
      })

      // Submit to API with uploaded artwork URLs
      const response = await fetch('/api/submissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          campaignId: campaignId,
          title: formData.title,
          description: formData.description,
          tags: formData.tags,
          artworkUrl: artworkUrl,
          thumbnailUrl: thumbnailUrl,
          canvasData: assetMetadata.canvasData,
          assetMetadata: assetMetadata.assetMetadata,
          usedIpKitId: ipKitId
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to submit')
      }

      const result = await response.json()
      
      setUploadProgress({
        stage: 'complete',
        progress: 100,
        message: 'Submission successful!'
      })
      
      // Show success modal
      setSubmissionId(result.submission.id)
      setShowSuccess(true)
      
      // Call success callback
      onSubmissionSuccess?.(result.submission.id)
      
    } catch (error) {
      console.error('Submission failed:', error)
      setUploadProgress({
        stage: 'error',
        progress: 0,
        message: error instanceof Error ? error.message : 'Submission failed. Please try again.'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Helper function to get current user ID
  const getCurrentUserId = async (): Promise<string | null> => {
    try {
      const response = await fetch('/api/auth/me')
      if (response.ok) {
        const user = await response.json()
        return user.id
      }
    } catch (error) {
      console.error('Failed to get current user:', error)
    }
    return null
  }

  const addTag = () => {
    if (!newTag.trim()) return
    
    const tag = newTag.trim().toLowerCase()
    if (!formData.tags.includes(tag) && formData.tags.length < 10) {
      setFormData(prev => ({ ...prev, tags: [...prev.tags, tag] }))
      setNewTag('')
    }
  }

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }))
  }

  const handleSuccessClose = () => {
    setShowSuccess(false)
    setSubmissionId(null)
    setUploadProgress(null)
    setValidationErrors([])
    setValidationWarnings([])
    onClose()
  }

  const handleCreateAnother = () => {
    setShowSuccess(false)
    setSubmissionId(null)
    setUploadProgress(null)
    setValidationErrors([])
    setValidationWarnings([])
    // Reset the form for another submission
    setFormData({ title: '', description: '', tags: [] })
    setArtworkPreview(null)
    validateCanvasAndGeneratePreview()
  }

  const handleModalClose = () => {
    // Clear any upload in progress and reset state
    setUploadProgress(null)
    setValidationErrors([])
    setValidationWarnings([])
    setErrors({})
    onClose()
  }

  // Clean up preview URL when modal closes
  useEffect(() => {
    return () => {
      if (artworkPreview) {
        URL.revokeObjectURL(artworkPreview)
      }
    }
  }, [artworkPreview])

  return (
    <>
      <Dialog open={isOpen && !showSuccess} onOpenChange={handleModalClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Submit Your Creation</DialogTitle>
            <p className="text-sm text-muted-foreground">
              Campaign: <span className="font-medium">{campaignTitle}</span>
            </p>
          </DialogHeader>
          
          {isGeneratingPreview ? (
            <div className="flex items-center justify-center p-8">
              <div className="text-center">
                <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Generating preview...</p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Artwork Preview */}
              {artworkPreview && (
                <div className="space-y-2">
                  <Label>Artwork Preview</Label>
                  <div className="border-2 border-dashed border-muted rounded-lg p-4 text-center">
                    <img 
                      src={artworkPreview} 
                      alt="Canvas artwork preview" 
                      className="max-w-full max-h-48 mx-auto rounded"
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                      {canvasElements.length} elements on canvas
                    </p>
                  </div>
                  {errors.canvas && (
                    <p className="text-sm text-destructive flex items-center gap-1">
                      <AlertCircle className="h-4 w-4" />
                      {errors.canvas}
                    </p>
                  )}
                  {errors.validation && (
                    <p className="text-sm text-destructive flex items-center gap-1">
                      <AlertCircle className="h-4 w-4" />
                      {errors.validation}
                    </p>
                  )}
                  {validationWarnings.length > 0 && (
                    <div className="space-y-1">
                      {validationWarnings.map((warning, index) => (
                        <p key={index} className="text-sm text-yellow-600 flex items-center gap-1">
                          <AlertCircle className="h-4 w-4" />
                          {warning}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Upload Progress */}
              {uploadProgress && (
                <div className="space-y-2">
                  <Label>Upload Progress</Label>
                  <div className="border border-border rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-2">
                      {uploadProgress.stage === 'error' ? (
                        <AlertCircle className="h-5 w-5 text-destructive" />
                      ) : uploadProgress.stage === 'complete' ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      )}
                      <span className="text-sm font-medium">{uploadProgress.message}</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-300 ${
                          uploadProgress.stage === 'error' 
                            ? 'bg-destructive' 
                            : uploadProgress.stage === 'complete'
                            ? 'bg-green-600'
                            : 'bg-primary'
                        }`}
                        style={{ width: `${uploadProgress.progress}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {uploadProgress.progress}% complete
                    </p>
                  </div>
                </div>
              )}

              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">
                  Title <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Give your creation a catchy title..."
                  maxLength={100}
                  className={errors.title ? 'border-destructive' : ''}
                />
                {errors.title && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" />
                    {errors.title}
                  </p>
                )}
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">
                  Description <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe your creative process, inspiration, or key features..."
                  rows={4}
                  maxLength={1000}
                  className={errors.description ? 'border-destructive' : ''}
                />
                {errors.description && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" />
                    {errors.description}
                  </p>
                )}
              </div>

              {/* Tags */}
              <div className="space-y-2">
                <Label htmlFor="tags">Tags (Optional)</Label>
                <div className="flex gap-2">
                  <Input
                    id="tags"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        addTag()
                      }
                    }}
                    placeholder="Add a tag..."
                    maxLength={20}
                    disabled={formData.tags.length >= 10}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addTag}
                    disabled={!newTag.trim() || formData.tags.length >= 10}
                  >
                    Add
                  </Button>
                </div>
                
                {formData.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {formData.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                        {tag}
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          className="hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleModalClose}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                
                <Button
                  type="submit"
                  disabled={isSubmitting || validationErrors.length > 0}
                  className="flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                      {uploadProgress?.stage === 'uploading_artwork' ? 'Uploading...' : 
                       uploadProgress?.stage === 'uploading_thumbnail' ? 'Processing...' :
                       uploadProgress?.stage === 'preparing' ? 'Preparing...' : 'Submitting...'}
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Submit Creation
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {submissionId && (
        <SubmissionSuccess
          isOpen={showSuccess}
          onClose={handleSuccessClose}
          submissionId={submissionId}
          campaignTitle={campaignTitle}
          onCreateAnother={handleCreateAnother}
          onViewSubmissions={() => {
            // Navigate to creator submissions page
            window.location.href = '/my-submissions'
          }}
        />
      )}
    </>
  )
}