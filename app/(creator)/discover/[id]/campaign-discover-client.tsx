"use client"

import {useState, useEffect} from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {Badge} from "@/components/ui/badge"
import {Button} from "@/components/ui/button"
import {CampaignWithAssets, SubmissionWithDetails} from "@/types"
import {cn} from "@/lib/utils"
import {
  Calendar,
  Users,
  Image,
  Share,
  Download,
  Clock,
  AlertCircle,
  Palette,
  CheckCircle,
  Heart,
  ExternalLink,
  Award,
  Loader2,
  ArrowRight,
} from "lucide-react"
import Link from "next/link"
import NextImage from "next/image"

interface CampaignDiscoverClientProps {
  campaign: any
}

export function CampaignDiscoverClient({
  campaign,
}: CampaignDiscoverClientProps) {
  const [isLiked, setIsLiked] = useState(false)
  const [approvedSubmissions, setApprovedSubmissions] = useState<
    SubmissionWithDetails[]
  >([])
  const [submissionsLoading, setSubmissionsLoading] = useState(true)
  const [submissionsError, setSubmissionsError] = useState<string | null>(null)

  // Fetch approved submissions for this campaign
  useEffect(() => {
    const fetchSubmissions = async () => {
      try {
        setSubmissionsLoading(true)
        setSubmissionsError(null)

        // Use real API for all campaigns (now using only database data)
        const response = await fetch(
          `/api/campaigns/${campaign.id}/submissions?status=approved&limit=8`
        )

        if (!response.ok) {
          throw new Error("Failed to fetch submissions")
        }

        const data = await response.json()
        setApprovedSubmissions(data.submissions || [])
      } catch (error) {
        console.error("Error fetching submissions:", error)
        setSubmissionsError("Failed to load submissions")
      } finally {
        setSubmissionsLoading(false)
      }
    }

    fetchSubmissions()
  }, [campaign.id])

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "default"
      case "draft":
        return "secondary"
      case "closed":
        return "outline"
      default:
        return "secondary"
    }
  }

  const getDaysUntilDeadline = () => {
    if (!campaign.deadline) return 0
    const today = new Date()
    const deadline = new Date(campaign.deadline)
    const diffTime = deadline.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const daysLeft = getDaysUntilDeadline()
  const isActive = campaign.status === "active" && daysLeft > 0

  // Smart fallback for campaign images
  const getCampaignImage = () => {
    if (campaign.thumbnail_url) return campaign.thumbnail_url
    if (campaign.thumbnailUrl) return campaign.thumbnailUrl
    if (campaign.imageUrl) return campaign.imageUrl
    // Return null to show gradient fallback instead of placeholder
    return null
  }

  const campaignImage = getCampaignImage()

  return (
    <div className='min-h-screen'>
      {/* Cinematic Hero Section */}
      <div className='relative h-[60vh] min-h-[400px] max-h-[600px] overflow-hidden'>
        {/* Hero Image or Gradient Fallback */}
        <div className='absolute inset-0'>
          {campaignImage ? (
            <>
              <NextImage
                src={campaignImage}
                alt={campaign.title}
                fill
                className='object-cover'
                priority
                sizes="100vw"
              />
              {/* Gradient Overlay */}
              <div className='absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20' />
            </>
          ) : (
            /* Brand-themed gradient fallback */
            <div className={cn(
              "w-full h-full",
              campaign.featured 
                ? "bg-gradient-to-br from-amber-600 via-orange-500 to-red-500"
                : "bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700"
            )} />
          )}
          {campaign.featured && (
            <div className='absolute inset-0 bg-gradient-to-t from-amber-900/60 via-amber-600/20 to-yellow-400/10' />
          )}
        </div>

        {/* Hero Content */}
        <div className='relative h-full flex items-end'>
          <div className='container mx-auto px-4 pb-12 max-w-7xl'>
            <div className='flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6'>
              {/* Title Section */}
              <div className='space-y-4 flex-1'>
                {/* Badges */}
                <div className='flex items-center gap-3 flex-wrap'>
                  {campaign.featured && (
                    <Badge className='bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-bold text-sm px-4 py-2 shadow-lg border border-yellow-400 animate-pulse'>
                      ⭐ FEATURED
                    </Badge>
                  )}
                  <Badge
                    variant='outline'
                    className={cn(
                      "text-white border-white/30 bg-black/20 backdrop-blur-sm text-sm px-3 py-1",
                      campaign.status === "active" &&
                        "border-green-400/50 bg-green-500/20",
                      campaign.status === "closed" &&
                        "border-red-400/50 bg-red-500/20"
                    )}
                  >
                    {campaign.status.charAt(0).toUpperCase() +
                      campaign.status.slice(1)}
                  </Badge>
                </div>

                {/* Brand */}
                <div className='flex items-center gap-2'>
                  <span className='text-white/80 text-lg'>By</span>
                  <Badge
                    variant='secondary'
                    className='bg-white/10 backdrop-blur-sm text-white border-white/20 text-lg px-4 py-2'
                  >
                    {campaign.brand?.name}
                  </Badge>
                </div>

                {/* Title */}
                <h1 className='text-4xl lg:text-6xl font-bold text-white leading-tight'>
                  {campaign.title}
                </h1>

                {/* Description */}
                <p className='text-xl text-white/90 leading-relaxed max-w-3xl'>
                  {campaign.description}
                </p>
              </div>

              {/* Action Buttons */}
              <div className='flex flex-col sm:flex-row gap-3 lg:flex-col lg:items-end'>
                {isActive && (
                  <Link href={`/create?campaign=${campaign.id}`}>
                    <Button
                      size='lg'
                      className='bg-primary hover:bg-primary/90 text-white shadow-lg hover:shadow-xl transition-all duration-200 px-8 py-4 text-lg'
                    >
                      <Palette className='mr-3 h-5 w-5' />
                      Start Creating
                    </Button>
                  </Link>
                )}
                <div className='flex gap-3'>
                  <Button
                    variant='outline'
                    size='lg'
                    onClick={() => setIsLiked(!isLiked)}
                    className='bg-black/20 backdrop-blur-sm text-white border-white/30 hover:bg-black/40'
                  >
                    <Heart
                      className={`mr-2 h-5 w-5 ${isLiked ? "fill-current text-red-400" : ""}`}
                    />
                    {isLiked ? "Liked" : "Like"}
                  </Button>
                  <Button
                    variant='outline'
                    size='lg'
                    className='bg-black/20 backdrop-blur-sm text-white border-white/30 hover:bg-black/40'
                  >
                    <Share className='mr-2 h-5 w-5' />
                    Share
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

      <div className='container mx-auto px-4 py-8 max-w-7xl'>
        {/* Campaign Status Alert */}
        {daysLeft <= 7 && daysLeft > 0 && (
          <Card className='mb-6 border-orange-200 bg-orange-50'>
            <CardContent className='pt-6'>
              <div className='flex items-center gap-3'>
                <AlertCircle className='h-5 w-5 text-orange-600' />
                <div>
                  <h3 className='font-medium text-orange-800'>
                    Only {daysLeft} days left to participate!
                  </h3>
                  <p className='text-sm text-orange-700'>
                    This campaign ends on{" "}
                    {campaign.deadline
                      ? new Date(campaign.deadline).toLocaleDateString()
                      : "No deadline set"}
                    .
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {!isActive && campaign.status === "closed" && (
          <Card className='mb-6 border-gray-200 bg-gray-50'>
            <CardContent className='pt-6'>
              <div className='flex items-center gap-3'>
                <CheckCircle className='h-5 w-5 text-gray-600' />
                <div>
                  <h3 className='font-medium text-gray-800'>Campaign Closed</h3>
                  <p className='text-sm text-gray-700'>
                    This campaign ended on{" "}
                    {campaign.deadline
                      ? new Date(campaign.deadline).toLocaleDateString()
                      : "an unknown date"}
                    . Check out other active campaigns!
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className='grid grid-cols-1 lg:grid-cols-3 gap-8'>
          {/* Main Content */}
          <div className='lg:col-span-2 space-y-6'>
            {/* Campaign Description */}
            <Card>
              <CardHeader>
                <CardTitle>About This Campaign</CardTitle>
              </CardHeader>
              <CardContent className='space-y-4'>
                <p className='text-muted-foreground leading-relaxed'>
                  {campaign.description}
                </p>
              </CardContent>
            </Card>

            {/* Creative Guidelines */}
            <Card>
              <CardHeader>
                <CardTitle>Creative Guidelines</CardTitle>
                <CardDescription>
                  Follow these guidelines to ensure your submission meets the
                  brand requirements
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className='p-4 bg-blue-50 border border-blue-200 rounded-lg'>
                  <p className='text-sm leading-relaxed text-blue-900'>
                    {campaign.guidelines}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Asset Preview */}
            <Card>
              <CardHeader>
                <div className='flex items-center justify-between'>
                  <div>
                    <CardTitle>Available Assets</CardTitle>
                    <CardDescription>
                      Official brand assets you can use in your creation
                    </CardDescription>
                  </div>
                  {isActive && (
                    <Link href={`/create?campaign=${campaign.id}`}>
                      <Button variant='outline' size='sm'>
                        <ExternalLink className='mr-2 h-4 w-4' />
                        Use in Canvas
                      </Button>
                    </Link>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {campaign.assets.length > 0 ? (
                  <div className='grid grid-cols-2 md:grid-cols-3 gap-4'>
                    {campaign.assets.map((asset: any) => (
                      <div key={asset.id} className='group relative'>
                        <div className='aspect-square bg-muted rounded-lg overflow-hidden relative'>
                          <NextImage
                            src={asset.url}
                            alt={asset.filename}
                            fill
                            className='object-cover group-hover:scale-105 transition-transform'
                            sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 20vw"
                          />
                        </div>
                        <div className='mt-2 space-y-1'>
                          <p className='text-sm font-medium truncate'>
                            {asset.filename}
                          </p>
                          <Badge variant='outline' className='text-xs'>
                            {asset.category}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className='text-center py-8 text-muted-foreground'>
                    <Image
                      className='mx-auto h-8 w-8 mb-2'
                      aria-hidden='true'
                    />
                    <p className='text-sm'>
                      Assets will be available when the campaign becomes active
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Community Showcase */}
            <Card>
              <CardHeader>
                <div className='flex items-center justify-between'>
                  <div>
                    <CardTitle>Community Showcase</CardTitle>
                    <CardDescription>
                      Amazing submissions from fellow creators
                    </CardDescription>
                  </div>
                  <div className='flex items-center gap-2'>
                    <Badge variant='outline'>
                      {approvedSubmissions.length} approved works
                    </Badge>
                    {approvedSubmissions.length > 4 && (
                      <Link href={`/discover/${campaign.id}/submissions`}>
                        <Button variant='outline' size='sm'>
                          View All
                          <ArrowRight className='ml-2 h-4 w-4' />
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {submissionsLoading ? (
                  <div className='flex items-center justify-center py-8'>
                    <Loader2 className='h-6 w-6 animate-spin text-muted-foreground' />
                    <span className='ml-2 text-sm text-muted-foreground'>
                      Loading submissions...
                    </span>
                  </div>
                ) : submissionsError ? (
                  <div className='text-center py-8 text-muted-foreground'>
                    <AlertCircle className='mx-auto h-8 w-8 mb-2 text-red-500' />
                    <p className='text-sm text-red-600'>{submissionsError}</p>
                    <p className='text-xs'>Please try refreshing the page</p>
                  </div>
                ) : approvedSubmissions.length > 0 ? (
                  <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                    {approvedSubmissions.slice(0, 4).map(submission => (
                      <div key={submission.id} className='group'>
                        <div className='aspect-video bg-muted rounded-lg overflow-hidden mb-3 relative'>
                          <NextImage
                            src={submission.artworkUrl}
                            alt={submission.title}
                            fill
                            className='object-cover group-hover:scale-105 transition-transform'
                            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          />
                        </div>
                        <div className='space-y-1'>
                          <h3 className='font-medium'>{submission.title}</h3>
                          <p className='text-sm text-muted-foreground'>
                            By{" "}
                            {submission.creator?.displayName ||
                              "Anonymous Creator"}
                          </p>
                          <div className='flex items-center gap-2'>
                            <Badge variant='outline' className='text-xs'>
                              <Award className='mr-1 h-3 w-3' />
                              Approved
                            </Badge>
                            {submission.likeCount > 0 && (
                              <Badge variant='secondary' className='text-xs'>
                                <Heart className='mr-1 h-3 w-3' />
                                {submission.likeCount}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className='text-center py-8 text-muted-foreground'>
                    <Users className='mx-auto h-8 w-8 mb-2' />
                    <p className='text-sm'>No submissions yet</p>
                    <p className='text-xs'>
                      Be the first to create something amazing!
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className='space-y-6'>
            {/* Campaign Info */}
            <Card>
              <CardHeader>
                <CardTitle>Campaign Details</CardTitle>
              </CardHeader>
              <CardContent className='space-y-4'>
                <div className='space-y-3'>
                  <div className='flex justify-between items-center'>
                    <span className='text-sm text-muted-foreground'>
                      Status
                    </span>
                    <Badge variant={getStatusColor(campaign.status)}>
                      {campaign.status.charAt(0).toUpperCase() +
                        campaign.status.slice(1)}
                    </Badge>
                  </div>

                  <div className='flex justify-between items-center'>
                    <span className='text-sm text-muted-foreground'>
                      Deadline
                    </span>
                    <span className='text-sm font-medium'>
                      {campaign.deadline
                        ? new Date(campaign.deadline).toLocaleDateString()
                        : "No deadline"}
                    </span>
                  </div>

                  <div className='flex justify-between items-center'>
                    <span className='text-sm text-muted-foreground'>
                      Time Left
                    </span>
                    <span
                      className={`text-sm font-medium ${daysLeft <= 7 && daysLeft > 0 ? "text-orange-600" : daysLeft <= 0 ? "text-red-600" : ""}`}
                    >
                      {daysLeft > 0 ? `${daysLeft} days` : "Campaign ended"}
                    </span>
                  </div>

                  <div className='flex justify-between items-center'>
                    <span className='text-sm text-muted-foreground'>
                      Participants
                    </span>
                    <span className='text-sm font-medium'>
                      {approvedSubmissions.length}
                    </span>
                  </div>

                  <div className='flex justify-between items-center'>
                    <span className='text-sm text-muted-foreground'>
                      Assets
                    </span>
                    <span className='text-sm font-medium'>
                      {campaign.assets.length} files
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Call to Action */}
            {isActive && (
              <Card className='border-primary/20 bg-primary/5'>
                <CardHeader>
                  <CardTitle className='text-center'>
                    Ready to Create?
                  </CardTitle>
                  <CardDescription className='text-center'>
                    Use the official assets to create your masterpiece
                  </CardDescription>
                </CardHeader>
                <CardContent className='space-y-3'>
                  <Link href={`/create?campaign=${campaign.id}`}>
                    <Button className='w-full'>
                      <Palette className='mr-2 h-4 w-4' />
                      Start Creating
                    </Button>
                  </Link>
                  <p className='text-xs text-center text-muted-foreground'>
                    Join {approvedSubmissions.length} other creators in this
                    campaign
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Brand Info */}
            <Card>
              <CardHeader>
                <CardTitle>About {campaign.brand?.name}</CardTitle>
              </CardHeader>
              <CardContent className='space-y-3'>
                <div className='text-sm space-y-2'>
                  <p className='text-muted-foreground'>
                    This campaign is officially sponsored by{" "}
                    {campaign.brand?.name}. All submissions will be reviewed by
                    their creative team.
                  </p>
                </div>
                <div className='pt-2 space-y-2'>
                  <div className='flex justify-between text-sm'>
                    <span className='text-muted-foreground'>
                      Campaign Created
                    </span>
                    <span>
                      {campaign.createdAt
                        ? campaign.createdAt.toLocaleDateString()
                        : "Unknown"}
                    </span>
                  </div>
                  <div className='flex justify-between text-sm'>
                    <span className='text-muted-foreground'>Last Updated</span>
                    <span>
                      {campaign.updatedAt
                        ? campaign.updatedAt.toLocaleDateString()
                        : "Unknown"}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tips */}
            <Card>
              <CardHeader>
                <CardTitle>Pro Tips</CardTitle>
              </CardHeader>
              <CardContent className='space-y-3'>
                <div className='space-y-3 text-sm'>
                  <div className='flex items-start gap-2'>
                    <CheckCircle className='h-4 w-4 mt-0.5 text-green-600' />
                    <p>Read the guidelines carefully before starting</p>
                  </div>
                  <div className='flex items-start gap-2'>
                    <CheckCircle className='h-4 w-4 mt-0.5 text-green-600' />
                    <p>Use the provided assets creatively</p>
                  </div>
                  <div className='flex items-start gap-2'>
                    <CheckCircle className='h-4 w-4 mt-0.5 text-green-600' />
                    <p>Submit early to get feedback</p>
                  </div>
                  <div className='flex items-start gap-2'>
                    <CheckCircle className='h-4 w-4 mt-0.5 text-green-600' />
                    <p>Follow brand color schemes</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
