"use client"

import {useState} from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {Badge} from "@/components/ui/badge"
import {Button} from "@/components/ui/button"
import {Checkbox} from "@/components/ui/checkbox"
import {
  Eye,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  Calendar,
  User,
  MoreHorizontal,
  CheckSquare,
  Square,
} from "lucide-react"
import Link from "next/link"
import { StoryProtocolLink, StoryProtocolStatus } from "@/components/shared/story-protocol-link"

function getStatusColor(status: string) {
  switch (status) {
    case "approved":
      return "default"
    case "pending":
      return "secondary"
    case "rejected":
      return "destructive"
    case "withdrawn":
      return "outline"
    default:
      return "secondary"
  }
}

function getStatusText(status: string) {
  return status.charAt(0).toUpperCase() + status.slice(1)
}

function formatDate(date: string | Date) {
  const dateObj = typeof date === "string" ? new Date(date) : date
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(dateObj)
}

interface SubmissionQueueClientProps {
  submissions: any[]
  onSelectionChange: (selectedIds: string[]) => void
  selectedSubmissions: string[]
}

export function SubmissionQueueClient({
  submissions,
  onSelectionChange,
  selectedSubmissions,
}: SubmissionQueueClientProps) {
  const toggleSubmission = (submissionId: string) => {
    const newSelection = selectedSubmissions.includes(submissionId)
      ? selectedSubmissions.filter(id => id !== submissionId)
      : [...selectedSubmissions, submissionId]

    onSelectionChange(newSelection)
  }

  const toggleAllSubmissions = () => {
    const pendingSubmissions = submissions.filter(s => s.status === "pending")
    const allPendingSelected = pendingSubmissions.every(s =>
      selectedSubmissions.includes(s.id)
    )

    if (allPendingSelected) {
      // Deselect all pending submissions
      const newSelection = selectedSubmissions.filter(
        id => !pendingSubmissions.some(s => s.id === id)
      )
      onSelectionChange(newSelection)
    } else {
      // Select all pending submissions
      const pendingIds = pendingSubmissions.map(s => s.id)
      const uniqueSelection = new Set([...selectedSubmissions, ...pendingIds])
      const newSelection = Array.from(uniqueSelection)
      onSelectionChange(newSelection)
    }
  }

  const pendingSubmissions = submissions.filter(s => s.status === "pending")
  const allPendingSelected =
    pendingSubmissions.length > 0 &&
    pendingSubmissions.every(s => selectedSubmissions.includes(s.id))

  return (
    <div className='space-y-6'>
      {/* Bulk Selection Header */}
      {pendingSubmissions.length > 0 && (
        <div className='flex items-center justify-between p-4 bg-muted/50 rounded-lg'>
          <div className='flex items-center gap-3'>
            <Checkbox
              checked={allPendingSelected}
              onCheckedChange={toggleAllSubmissions}
              aria-label='Select all pending submissions'
            />
            <span className='text-sm font-medium'>
              Select all pending submissions ({pendingSubmissions.length})
            </span>
          </div>
          {selectedSubmissions.length > 0 && (
            <span className='text-sm text-muted-foreground'>
              {selectedSubmissions.length} selected
            </span>
          )}
        </div>
      )}

      {/* Submissions Grid */}
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
        {submissions.map((submission: any) => {
          const isSelected = selectedSubmissions.includes(submission.id)
          const isPending = submission.status === "pending"

          return (
            <Card
              key={submission.id}
              className={`group hover:shadow-lg transition-all duration-200 ${
                isSelected ? "ring-2 ring-primary" : ""
              }`}
            >
              <div className='aspect-video bg-muted rounded-t-lg overflow-hidden relative'>
                <img
                  src={submission.artworkUrl}
                  alt={submission.title}
                  className='w-full h-full object-cover group-hover:scale-105 transition-transform duration-200'
                />
                {/* Submission selection checkbox */}
                {isPending && (
                  <div className='absolute top-3 left-3'>
                    <Button
                      variant='secondary'
                      size='sm'
                      className='p-1.5 shadow-md'
                      onClick={() => toggleSubmission(submission.id)}
                    >
                      {isSelected ? (
                        <CheckSquare className='h-4 w-4 text-primary' />
                      ) : (
                        <Square className='h-4 w-4' />
                      )}
                    </Button>
                  </div>
                )}
              </div>

              <CardHeader className='space-y-4'>
                <div className='flex items-start justify-between'>
                  <div className='flex items-center gap-2'>
                    <Badge variant={getStatusColor(submission.status) as any}>
                      {getStatusText(submission.status)}
                    </Badge>
                    {submission.rating && (
                      <div className='flex items-center gap-1 text-sm text-muted-foreground'>
                        <span>★</span>
                        <span>{submission.rating}/5</span>
                      </div>
                    )}
                    <StoryProtocolStatus 
                      ipId={submission.storyProtocolIpId}
                      submissionStatus={submission.status}
                    />
                  </div>
                  <div className='flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity'>
                    <Button variant='ghost' size='sm' asChild>
                      <Link href={`/submissions/${submission.id}`}>
                        <Eye className='h-4 w-4' />
                      </Link>
                    </Button>
                    <Button variant='ghost' size='sm'>
                      <MoreHorizontal className='h-4 w-4' />
                    </Button>
                  </div>
                </div>
                <div>
                  <CardTitle className='text-lg mb-2 line-clamp-2'>
                    {submission.title}
                  </CardTitle>
                  <CardDescription className='line-clamp-2'>
                    {submission.description || "No description provided"}
                  </CardDescription>
                </div>
              </CardHeader>

              <CardContent className='pt-0 space-y-4'>
                <div className='space-y-2'>
                  <div className='flex items-center gap-2 text-sm'>
                    <User className='h-4 w-4 text-muted-foreground' />
                    <span>
                      {submission.creator?.displayName || "Unknown Creator"}
                    </span>
                  </div>
                  <div className='flex items-center gap-2 text-sm'>
                    <Calendar className='h-4 w-4 text-muted-foreground' />
                    <span>{formatDate(submission.createdAt)}</span>
                  </div>
                  <div className='text-sm text-muted-foreground'>
                    <span className='font-medium'>
                      {submission.brand?.name}
                    </span>{" "}
                    • {submission.campaign?.title}
                  </div>
                  {submission.reviewedAt && submission.reviewedBy && (
                    <div className='text-sm text-muted-foreground'>
                      Reviewed by {submission.reviewedBy.displayName} on{" "}
                      {formatDate(submission.reviewedAt)}
                    </div>
                  )}
                </div>

                {submission.feedback && (
                  <div className='p-3 bg-muted/50 rounded-lg'>
                    <div className='flex items-center gap-2 mb-1'>
                      <MessageSquare className='h-4 w-4 text-muted-foreground' />
                      <span className='text-sm font-medium'>Feedback</span>
                    </div>
                    <p className='text-sm text-muted-foreground line-clamp-2'>
                      {submission.feedback}
                    </p>
                  </div>
                )}

                <div className='flex items-center justify-between pt-2 border-t'>
                  <div className='flex items-center gap-4 text-sm text-muted-foreground'>
                    <div className='flex items-center gap-1'>
                      <Eye className='h-4 w-4' />
                      <span>{submission.viewCount || 0}</span>
                    </div>
                    <div className='flex items-center gap-1'>
                      <ThumbsUp className='h-4 w-4' />
                      <span>{submission.likeCount || 0}</span>
                    </div>
                  </div>
                  {submission.status === "pending" ? (
                    <div className='flex gap-1'>
                      <Button
                        variant='outline'
                        size='sm'
                        className='text-green-600 hover:text-green-700'
                      >
                        <ThumbsUp className='h-4 w-4' />
                      </Button>
                      <Button
                        variant='outline'
                        size='sm'
                        className='text-red-600 hover:text-red-700'
                      >
                        <ThumbsDown className='h-4 w-4' />
                      </Button>
                    </div>
                  ) : (
                    <div className='flex gap-1'>
                      <Button variant='outline' size='sm' asChild>
                        <Link href={`/submissions/${submission.id}`}>Review</Link>
                      </Button>
                      <StoryProtocolLink 
                        ipId={submission.storyProtocolIpId}
                        submissionStatus={submission.status}
                        size="sm"
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
