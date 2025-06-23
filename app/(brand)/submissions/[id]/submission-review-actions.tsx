"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ThumbsUp, ThumbsDown, Star, AlertTriangle } from "lucide-react"
import { toast } from "sonner"

interface SubmissionReviewActionsProps {
  submission: any
}

export function SubmissionReviewActions({ submission }: SubmissionReviewActionsProps) {
  const router = useRouter()
  const [feedback, setFeedback] = useState("")
  const [rating, setRating] = useState<string>("")
  const [internalNotes, setInternalNotes] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)

  const handleReview = async (action: 'approve' | 'reject') => {
    if (action === 'reject' && !feedback.trim()) {
      toast.error("Feedback is required when rejecting a submission")
      return
    }

    setIsProcessing(true)
    try {
      const response = await fetch(`/api/submissions/${submission.id}/review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          feedback: feedback.trim() || undefined,
          rating: rating ? parseInt(rating) : undefined,
          internalNotes: internalNotes.trim() || undefined,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to submit review')
      }

      const result = await response.json()
      
      toast.success(`Submission ${action}d successfully`)
      
      // Refresh the page to show updated status
      router.refresh()
      
    } catch (error) {
      console.error('Review submission failed:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to submit review')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Star className="h-5 w-5" />
          Review Submission
        </CardTitle>
        <CardDescription>
          Provide feedback and approve or reject this submission. Your decision will be recorded and the creator will be notified.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Rating */}
        <div className="space-y-2">
          <Label htmlFor="rating">Rating (Optional)</Label>
          <Select value={rating} onValueChange={setRating}>
            <SelectTrigger>
              <SelectValue placeholder="Select a rating" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5">★★★★★ Excellent (5/5)</SelectItem>
              <SelectItem value="4">★★★★☆ Good (4/5)</SelectItem>
              <SelectItem value="3">★★★☆☆ Average (3/5)</SelectItem>
              <SelectItem value="2">★★☆☆☆ Below Average (2/5)</SelectItem>
              <SelectItem value="1">★☆☆☆☆ Poor (1/5)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Feedback */}
        <div className="space-y-2">
          <Label htmlFor="feedback">Feedback</Label>
          <Textarea
            id="feedback"
            placeholder="Provide detailed feedback for the creator. This will be visible to them and help improve future submissions..."
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            className="min-h-[120px]"
          />
          <p className="text-xs text-muted-foreground">
            Required for rejections. Helps creators understand your decision and improve.
          </p>
        </div>

        {/* Internal Notes */}
        <div className="space-y-2">
          <Label htmlFor="internalNotes">Internal Notes (Optional)</Label>
          <Textarea
            id="internalNotes"
            placeholder="Add internal notes for your team. These will not be visible to the creator..."
            value={internalNotes}
            onChange={(e) => setInternalNotes(e.target.value)}
            className="min-h-[80px]"
          />
          <p className="text-xs text-muted-foreground">
            Private notes for internal team review and audit purposes.
          </p>
        </div>

        {/* Warning for rejection without feedback */}
        {!feedback.trim() && (
          <div className="flex items-start gap-3 p-4 bg-orange-50 border border-orange-200 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-orange-800">
                Feedback Required for Rejection
              </p>
              <p className="text-sm text-orange-700 mt-1">
                Please provide constructive feedback to help the creator understand your decision and improve future submissions.
              </p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4 border-t">
          <Button
            onClick={() => handleReview('approve')}
            disabled={isProcessing}
            className="flex-1 bg-green-600 hover:bg-green-700"
          >
            <ThumbsUp className="h-4 w-4 mr-2" />
            {isProcessing ? 'Processing...' : 'Approve Submission'}
          </Button>
          
          <Button
            onClick={() => handleReview('reject')}
            disabled={isProcessing || !feedback.trim()}
            variant="destructive"
            className="flex-1"
          >
            <ThumbsDown className="h-4 w-4 mr-2" />
            {isProcessing ? 'Processing...' : 'Reject Submission'}
          </Button>
        </div>

        {/* Guidelines */}
        <div className="text-xs text-muted-foreground pt-4 border-t">
          <p className="font-medium mb-2">Review Guidelines:</p>
          <ul className="space-y-1 list-disc list-inside">
            <li>Be constructive and specific in your feedback</li>
            <li>Consider the submission against campaign guidelines</li>
            <li>Ratings help creators understand quality expectations</li>
            <li>Internal notes are for team coordination only</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}