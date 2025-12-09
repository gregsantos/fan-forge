"use client"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { CheckCircle, ExternalLink, Eye, ArrowLeft } from "lucide-react"

interface SubmissionSuccessProps {
  isOpen: boolean
  onClose: () => void
  submissionId: string
  campaignTitle: string
  onViewSubmissions?: () => void
  onCreateAnother?: () => void
}

export function SubmissionSuccess({
  isOpen,
  onClose,
  submissionId,
  campaignTitle,
  onViewSubmissions,
  onCreateAnother
}: SubmissionSuccessProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-green-100 p-3">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </div>
          <DialogTitle className="text-xl">Submission Successful!</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 text-center">
          <p className="text-muted-foreground">
            Your creation has been submitted to <span className="font-medium">{campaignTitle}</span> and is now under review.
          </p>
          
          <div className="bg-muted rounded-lg p-4">
            <p className="text-sm font-medium mb-1">Submission ID</p>
            <p className="text-xs font-mono text-muted-foreground break-all">{submissionId}</p>
          </div>
          
          <div className="text-sm text-muted-foreground space-y-2">
            <p>✅ Your artwork has been saved</p>
            <p>⏳ Review process has started</p>
            <p>📧 You&apos;ll be notified of the outcome</p>
          </div>
          
          <div className="flex flex-col gap-2 pt-4">
            {onViewSubmissions && (
              <Button onClick={onViewSubmissions} className="w-full">
                <Eye className="h-4 w-4 mr-2" />
                View My Submissions
              </Button>
            )}
            
            <div className="flex gap-2">
              {onCreateAnother && (
                <Button variant="outline" onClick={onCreateAnother} className="flex-1">
                  Create Another
                </Button>
              )}
              
              <Button variant="outline" onClick={onClose} className="flex-1">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Canvas
              </Button>
            </div>
          </div>
          
          <div className="pt-4 border-t">
            <p className="text-xs text-muted-foreground">
              Need help? Check the{" "}
              <Button variant="link" className="h-auto p-0 text-xs">
                submission guidelines
                <ExternalLink className="h-3 w-3 ml-1" />
              </Button>
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}