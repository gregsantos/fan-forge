"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { SubmissionSuccess } from "./submission-success"
import { CanvasElement } from "@/types"
import { exportCanvas } from "@/lib/canvas-export"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { X, Send, AlertCircle } from "lucide-react"

interface SubmissionModalProps {
  isOpen: boolean
  onClose: () => void
  campaignId: string
  campaignTitle: string
  canvasElements: CanvasElement[]
  assets: any[]
  onSubmissionSuccess?: (submissionId: string) => void
}

export function SubmissionModal({
  isOpen,
  onClose,
  campaignId,
  campaignTitle,
  canvasElements,
  assets,
  onSubmissionSuccess
}: SubmissionModalProps) {
  const [artworkPreview, setArtworkPreview] = useState<string | null>(null)
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false)
  const [submissionId, setSubmissionId] = useState<string | null>(null)
  const [showSuccess, setShowSuccess] = useState(false)
  
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    tags: [] as string[]
  })
  const [newTag, setNewTag] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Generate artwork preview when modal opens
  useEffect(() => {
    if (isOpen && canvasElements.length > 0 && !showSuccess) {
      generateArtworkPreview()
    }
  }, [isOpen, canvasElements, showSuccess])

  const generateArtworkPreview = async () => {
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
  }

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

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)
    try {
      // Generate high-quality artwork for submission
      const artworkBlob = await exportCanvas(
        canvasElements,
        assets,
        { width: 800, height: 600 },
        { format: 'png', scale: 2 } // High quality for submission
      )

      const artworkUrl = URL.createObjectURL(artworkBlob)

      // Submit to API
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
          canvasData: {
            elements: canvasElements,
            canvasSize: { width: 800, height: 600 },
            version: "1.0"
          }
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to submit')
      }

      const result = await response.json()
      
      // Show success modal
      setSubmissionId(result.submission.id)
      setShowSuccess(true)
      
      // Call success callback
      onSubmissionSuccess?.(result.submission.id)
      
    } catch (error) {
      console.error('Submission failed:', error)
      alert('Submission failed. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
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
    onClose()
  }

  const handleCreateAnother = () => {
    setShowSuccess(false)
    setSubmissionId(null)
    // Reset the form for another submission
    setFormData({ title: '', description: '', tags: [] })
    setArtworkPreview(null)
    generateArtworkPreview()
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
      <Dialog open={isOpen && !showSuccess} onOpenChange={onClose}>
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
                  onClick={onClose}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                      Submitting...
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