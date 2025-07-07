import {notFound} from "next/navigation"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {Badge} from "@/components/ui/badge"
import {Button} from "@/components/ui/button"
import {Separator} from "@/components/ui/separator"
import {
  ArrowLeft,
  Calendar,
  User,
  Building,
  Star,
  Download,
  ExternalLink,
} from "lucide-react"
import Link from "next/link"
import {getSubmissionById} from "@/lib/data/campaigns"
import {SubmissionReviewActions} from "./submission-review-actions"
import {ReviewHistoryPanel} from "./review-history-panel"
import {StoryProtocolLink, StoryProtocolStatus} from "@/components/shared/story-protocol-link"

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

function formatDate(date: string | Date) {
  const dateObj = typeof date === "string" ? new Date(date) : date
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(dateObj)
}

interface SubmissionDetailPageProps {
  params: {
    id: string
  }
}

export default async function SubmissionDetailPage({
  params,
}: SubmissionDetailPageProps) {
  const submission = await getSubmissionById(params.id)

  if (!submission) {
    notFound()
  }

  return (
    <div className='container mx-auto p-6 space-y-8'>
      {/* Header */}
      <div className='flex items-center gap-4'>
        <Button variant='ghost' size='sm' asChild>
          <Link href='/submissions' className='flex items-center gap-2'>
            <ArrowLeft className='h-4 w-4' />
            Back to Queue
          </Link>
        </Button>
        <Separator orientation='vertical' className='h-6' />
        <div className='flex items-center gap-3'>
          <Badge variant={getStatusColor(submission.status) as any}>
            {submission.status.charAt(0).toUpperCase() +
              submission.status.slice(1)}
          </Badge>
          {submission.rating && (
            <div className='flex items-center gap-1 text-sm'>
              <Star className='h-4 w-4 fill-yellow-400 text-yellow-400' />
              <span>{submission.rating}/5</span>
            </div>
          )}
          <StoryProtocolStatus 
            ipId={submission.storyProtocolIpId}
            submissionStatus={submission.status}
            showFull={true}
          />
        </div>
      </div>

      <div className='grid grid-cols-1 lg:grid-cols-3 gap-8'>
        {/* Main Content */}
        <div className='lg:col-span-2 space-y-6'>
          {/* Artwork Display */}
          <Card>
            <CardHeader>
              <div className='flex items-start justify-between'>
                <div>
                  <CardTitle className='text-2xl'>{submission.title}</CardTitle>
                  {submission.description && (
                    <CardDescription className='mt-2 text-base'>
                      {submission.description}
                    </CardDescription>
                  )}
                </div>
                <div className='flex gap-2'>
                  <Button variant='outline' size='sm'>
                    <Download className='h-4 w-4 mr-2' />
                    Download
                  </Button>
                  <Button variant='outline' size='sm' asChild>
                    <a
                      href={submission.artworkUrl}
                      target='_blank'
                      rel='noopener noreferrer'
                    >
                      <ExternalLink className='h-4 w-4 mr-2' />
                      Open Original
                    </a>
                  </Button>
                  <StoryProtocolLink 
                    ipId={submission.storyProtocolIpId}
                    submissionStatus={submission.status}
                    size="sm"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className='aspect-video bg-muted rounded-lg overflow-hidden'>
                <img
                  src={submission.artworkUrl}
                  alt={submission.title}
                  className='w-full h-full object-contain'
                />
              </div>

              {submission.tags && submission.tags.length > 0 && (
                <div className='mt-4'>
                  <p className='text-sm font-medium mb-2'>Tags</p>
                  <div className='flex flex-wrap gap-2'>
                    {submission.tags.map((tag: string, index: number) => (
                      <Badge key={index} variant='outline' className='text-xs'>
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Review Actions */}
          {submission.status === "pending" && (
            <SubmissionReviewActions submission={submission} />
          )}

          {/* Feedback Section */}
          {submission.feedback && (
            <Card>
              <CardHeader>
                <CardTitle className='text-lg'>Review Feedback</CardTitle>
              </CardHeader>
              <CardContent>
                <p className='text-muted-foreground'>{submission.feedback}</p>
                {submission.reviewedBy && submission.reviewedAt && (
                  <div className='mt-4 pt-4 border-t text-sm text-muted-foreground'>
                    Reviewed by {submission.reviewedBy.displayName} on{" "}
                    {formatDate(submission.reviewedAt)}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className='space-y-6'>
          {/* Creator Information */}
          <Card>
            <CardHeader>
              <CardTitle className='text-lg'>Creator Information</CardTitle>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='flex items-center gap-3'>
                {submission.creator?.avatarUrl ? (
                  <img
                    src={submission.creator.avatarUrl}
                    alt={submission.creator.displayName || "Creator"}
                    className='w-10 h-10 rounded-full'
                  />
                ) : (
                  <div className='w-10 h-10 rounded-full bg-muted flex items-center justify-center'>
                    <User className='h-5 w-5 text-muted-foreground' />
                  </div>
                )}
                <div>
                  <p className='font-medium'>
                    {submission.creator?.displayName || "Unknown Creator"}
                  </p>
                  <p className='text-sm text-muted-foreground'>
                    {submission.creator?.email}
                  </p>
                </div>
              </div>

              {submission.creator?.bio && (
                <div>
                  <p className='text-sm font-medium mb-1'>Bio</p>
                  <p className='text-sm text-muted-foreground'>
                    {submission.creator.bio}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Campaign Information */}
          <Card>
            <CardHeader>
              <CardTitle className='text-lg'>Campaign Details</CardTitle>
            </CardHeader>
            <CardContent className='space-y-3'>
              <div className='flex items-center gap-2'>
                <Building className='h-4 w-4 text-muted-foreground' />
                <span className='font-medium'>{submission.brand?.name}</span>
              </div>

              <div>
                <p className='font-medium'>{submission.campaign?.title}</p>
                {submission.campaign?.description && (
                  <p className='text-sm text-muted-foreground mt-1'>
                    {submission.campaign.description}
                  </p>
                )}
              </div>

              {submission.ipKit && (
                <div>
                  <p className='text-sm font-medium'>IP Kit Used</p>
                  <p className='text-sm text-muted-foreground'>
                    {submission.ipKit.name}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Submission Metadata */}
          <Card>
            <CardHeader>
              <CardTitle className='text-lg'>Submission Details</CardTitle>
            </CardHeader>
            <CardContent className='space-y-3'>
              <div className='flex items-center gap-2 text-sm'>
                <Calendar className='h-4 w-4 text-muted-foreground' />
                <span>Submitted {formatDate(submission.createdAt)}</span>
              </div>

              {submission.updatedAt &&
                submission.updatedAt !== submission.createdAt && (
                  <div className='flex items-center gap-2 text-sm'>
                    <Calendar className='h-4 w-4 text-muted-foreground' />
                    <span>Updated {formatDate(submission.updatedAt)}</span>
                  </div>
                )}

              <div className='flex items-center justify-between text-sm'>
                <span>Views</span>
                <span>{submission.viewCount}</span>
              </div>

              <div className='flex items-center justify-between text-sm'>
                <span>Likes</span>
                <span>{submission.likeCount}</span>
              </div>

              <div className='flex items-center justify-between text-sm'>
                <span>Public</span>
                <span>{submission.isPublic ? "Yes" : "No"}</span>
              </div>

              {submission.storyProtocolIpId && submission.status === "approved" && (
                <div className='pt-3 border-t'>
                  <p className='text-sm font-medium mb-2'>Story Protocol</p>
                  <StoryProtocolLink 
                    ipId={submission.storyProtocolIpId}
                    submissionStatus={submission.status}
                    variant="button"
                    size="sm"
                    className="w-full"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Review History */}
          {submission.reviewHistory && submission.reviewHistory.length > 0 && (
            <ReviewHistoryPanel reviews={submission.reviewHistory} />
          )}
        </div>
      </div>
    </div>
  )
}
