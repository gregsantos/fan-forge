import {notFound, redirect} from "next/navigation"
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
  Eye,
  MessageSquare,
} from "lucide-react"
import Link from "next/link"
import NextImage from "next/image"
import {getSubmissionById} from "@/lib/data/campaigns"
import {getCurrentUser} from "@/lib/auth-utils"
import {
  StoryProtocolLink,
  StoryProtocolStatus,
} from "@/components/shared/story-protocol-link"

function getStatusColor(status: string) {
  switch (status) {
    case "approved":
      return "bg-gradient-to-r from-green-500 to-emerald-500 text-white border-transparent"
    case "pending":
      return "bg-gradient-to-r from-orange-500 to-amber-500 text-white border-transparent"
    case "rejected":
      return "bg-gradient-to-r from-red-500 to-rose-500 text-white border-transparent"
    case "withdrawn":
      return "bg-gradient-to-r from-gray-500 to-slate-500 text-white border-transparent"
    default:
      return "bg-gradient-to-r from-gray-500 to-slate-500 text-white border-transparent"
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

interface CreatorSubmissionDetailPageProps {
  params: {
    id: string
  }
}

export default async function CreatorSubmissionDetailPage({
  params,
}: CreatorSubmissionDetailPageProps) {
  // Get current user (server-side)
  const user = await getCurrentUser()

  if (!user) {
    redirect("/login")
  }

  const submission = await getSubmissionById(params.id)

  if (!submission) {
    notFound()
  }

  // Verify user owns this submission
  if (submission.creator?.id !== user.id) {
    notFound()
  }

  return (
    <div className='container mx-auto p-6 space-y-8'>
      {/* Header */}
      <div className='flex items-center gap-4'>
        <Button variant='ghost' size='sm' asChild>
          <Link href='/my-submissions' className='flex items-center gap-2'>
            <ArrowLeft className='h-4 w-4' />
            Back to My Submissions
          </Link>
        </Button>
        <Separator orientation='vertical' className='h-6' />
        <div className='flex items-center gap-3'>
          <Badge
            className={`font-medium shadow-sm ${getStatusColor(submission.status)}`}
          >
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
                    size='sm'
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className='aspect-video bg-muted rounded-lg overflow-hidden'>
                <NextImage
                  src={submission.artworkUrl}
                  alt={submission.title}
                  width={800}
                  height={450}
                  className='w-full h-full object-contain'
                  unoptimized
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

          {/* Feedback Section */}
          {submission.feedback && (
            <Card>
              <CardHeader>
                <CardTitle className='text-lg flex items-center'>
                  <MessageSquare className='h-5 w-5 mr-2' />
                  Review Feedback
                </CardTitle>
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

          {/* Performance Stats */}
          <Card>
            <CardHeader>
              <CardTitle className='text-lg flex items-center'>
                <Eye className='h-5 w-5 mr-2' />
                Performance
              </CardTitle>
            </CardHeader>
            <CardContent className='grid grid-cols-2 gap-4'>
              <div className='text-center'>
                <div className='text-2xl font-bold text-primary'>
                  {submission.viewCount}
                </div>
                <div className='text-sm text-muted-foreground'>Views</div>
              </div>
              <div className='text-center'>
                <div className='text-2xl font-bold text-primary'>
                  {submission.likeCount}
                </div>
                <div className='text-sm text-muted-foreground'>Likes</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className='space-y-6'>
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
                <span>Status</span>
                <Badge
                  className={`font-medium shadow-sm text-xs ${getStatusColor(submission.status)}`}
                >
                  {submission.status.charAt(0).toUpperCase() +
                    submission.status.slice(1)}
                </Badge>
              </div>

              <div className='flex items-center justify-between text-sm'>
                <span>Public</span>
                <span>{submission.isPublic ? "Yes" : "No"}</span>
              </div>

              {submission.storyProtocolIpId &&
                submission.status === "approved" && (
                  <div className='pt-2 border-t'>
                    <p className='text-sm font-medium mb-2'>Story Protocol</p>
                    <StoryProtocolLink
                      ipId={submission.storyProtocolIpId}
                      submissionStatus={submission.status}
                      variant='button'
                      size='sm'
                      className='w-full'
                    />
                  </div>
                )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
