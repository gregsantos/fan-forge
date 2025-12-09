"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { 
  ChevronDown, 
  Download, 
  CheckSquare, 
  XSquare,
  Filter
} from "lucide-react"

interface SubmissionQueueActionsProps {
  submissions: any[]
  selectedSubmissions: string[]
  onSelectionChange: (selectedIds: string[]) => void
}

export function SubmissionQueueActions({ 
  submissions, 
  selectedSubmissions, 
  onSelectionChange 
}: SubmissionQueueActionsProps) {
  const [bulkActionDialog, setBulkActionDialog] = useState<{
    isOpen: boolean
    action: 'approve' | 'reject' | null
  }>({ isOpen: false, action: null })
  const [feedback, setFeedback] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)

  const pendingSubmissions = submissions.filter(s => s.status === 'pending')
  const hasSelectedSubmissions = selectedSubmissions.length > 0

  const handleBulkAction = async (action: 'approve' | 'reject') => {
    setBulkActionDialog({ isOpen: true, action })
  }

  const processBulkAction = async () => {
    if (!bulkActionDialog.action) return

    setIsProcessing(true)
    try {
      const response = await fetch('/api/submissions/bulk-review', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          submissionIds: selectedSubmissions,
          action: bulkActionDialog.action,
          feedback: feedback || undefined,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to process bulk action')
      }

      const result = await response.json()
      
      toast.success(`Successfully ${bulkActionDialog.action}d ${result.summary?.processed || selectedSubmissions.length} submission${selectedSubmissions.length !== 1 ? 's' : ''}`)
      
      // Reset state
      onSelectionChange([])
      setFeedback("")
      setBulkActionDialog({ isOpen: false, action: null })
      
      // Refresh the page to show updated data
      window.location.reload()
      
    } catch (error) {
      console.error('Bulk action failed:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to process bulk action')
    } finally {
      setIsProcessing(false)
    }
  }

  const exportSubmissions = () => {
    // TODO: Implement CSV export
    console.log('Exporting submissions...')
  }

  return (
    <div>
      <div className="flex items-center gap-2">
        {hasSelectedSubmissions && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{selectedSubmissions.length} selected</span>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handleBulkAction('approve')}
              className="text-green-600 hover:text-green-700"
            >
              <CheckSquare className="h-4 w-4 mr-1" />
              Approve All
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handleBulkAction('reject')}
              className="text-red-600 hover:text-red-700"
            >
              <XSquare className="h-4 w-4 mr-1" />
              Reject All
            </Button>
          </div>
        )}
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              Actions
              <ChevronDown className="h-4 w-4 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={exportSubmissions}>
              <Download className="h-4 w-4 mr-2" />
              Export to CSV
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onSelectionChange([])}>
              <Filter className="h-4 w-4 mr-2" />
              Clear Selection
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Bulk Action Dialog */}
      <Dialog 
        open={bulkActionDialog.isOpen} 
        onOpenChange={(open) => setBulkActionDialog({ isOpen: open, action: null })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Bulk {bulkActionDialog.action === 'approve' ? 'Approve' : 'Reject'} Submissions
            </DialogTitle>
            <DialogDescription>
              You are about to {bulkActionDialog.action} {selectedSubmissions.length} submission{selectedSubmissions.length !== 1 ? 's' : ''}. 
              {bulkActionDialog.action === 'reject' && ' Please provide feedback for the rejection.'}
            </DialogDescription>
          </DialogHeader>
          
          {bulkActionDialog.action === 'reject' && (
            <div className="space-y-2">
              <Label htmlFor="feedback">Feedback (Required)</Label>
              <Textarea
                id="feedback"
                placeholder="Please provide detailed feedback on why these submissions are being rejected..."
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
          )}
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setBulkActionDialog({ isOpen: false, action: null })}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              onClick={processBulkAction}
              disabled={isProcessing || (bulkActionDialog.action === 'reject' && !feedback.trim())}
              className={bulkActionDialog.action === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
            >
              {isProcessing ? 'Processing...' : `${bulkActionDialog.action === 'approve' ? 'Approve' : 'Reject'} ${selectedSubmissions.length} Submission${selectedSubmissions.length !== 1 ? 's' : ''}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}