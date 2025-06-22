"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CampaignWithAssets, SubmissionWithDetails } from "@/types"
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
  Loader2
} from "lucide-react"
import Link from "next/link"

interface CampaignDiscoverClientProps {
  campaign: any
}

export function CampaignDiscoverClient({ campaign }: CampaignDiscoverClientProps) {
  const [isLiked, setIsLiked] = useState(false)
  const [approvedSubmissions, setApprovedSubmissions] = useState<SubmissionWithDetails[]>([])
  const [submissionsLoading, setSubmissionsLoading] = useState(true)
  const [submissionsError, setSubmissionsError] = useState<string | null>(null)

  // Fetch approved submissions for this campaign
  useEffect(() => {
    const fetchSubmissions = async () => {
      try {
        setSubmissionsLoading(true)
        setSubmissionsError(null)
        
        // Use real API for all campaigns (now using only database data)
        const response = await fetch(`/api/campaigns/${campaign.id}/submissions?status=approved&limit=8`)
        
        if (!response.ok) {
          throw new Error('Failed to fetch submissions')
        }
        
        const data = await response.json()
        setApprovedSubmissions(data.submissions || [])
      } catch (error) {
        console.error('Error fetching submissions:', error)
        setSubmissionsError('Failed to load submissions')
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

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div className="space-y-2">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-3xl font-bold text-foreground">{campaign.title}</h1>
            <div className="flex items-center gap-2">
              {campaign.featured && (
                <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-bold text-xs px-3 py-1 shadow-md border border-yellow-400">
                  ⭐ FEATURED
                </Badge>
              )}
              <Badge variant={getStatusColor(campaign.status)}>
                {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
              </Badge>
            </div>
          </div>
          <p className="text-muted-foreground">
            By {campaign.brand?.name}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsLiked(!isLiked)}
          >
            <Heart className={`mr-2 h-4 w-4 ${isLiked ? 'fill-current text-red-500' : ''}`} />
            {isLiked ? 'Liked' : 'Like'}
          </Button>
          <Button variant="outline" size="sm">
            <Share className="mr-2 h-4 w-4" />
            Share
          </Button>
          {isActive && (
            <Link href={`/create?campaign=${campaign.id}`}>
              <Button>
                <Palette className="mr-2 h-4 w-4" />
                Start Creating
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Campaign Status Alert */}
      {daysLeft <= 7 && daysLeft > 0 && (
        <Card className="mb-6 border-orange-200 bg-orange-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              <div>
                <h3 className="font-medium text-orange-800">
                  Only {daysLeft} days left to participate!
                </h3>
                <p className="text-sm text-orange-700">
                  This campaign ends on {campaign.deadline ? new Date(campaign.deadline).toLocaleDateString() : 'No deadline set'}.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {!isActive && campaign.status === "closed" && (
        <Card className="mb-6 border-gray-200 bg-gray-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-gray-600" />
              <div>
                <h3 className="font-medium text-gray-800">Campaign Closed</h3>
                <p className="text-sm text-gray-700">
                  This campaign ended on {campaign.deadline ? new Date(campaign.deadline).toLocaleDateString() : 'an unknown date'}. Check out other active campaigns!
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Campaign Description */}
          <Card>
            <CardHeader>
              <CardTitle>About This Campaign</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground leading-relaxed">
                {campaign.description}
              </p>
            </CardContent>
          </Card>

          {/* Creative Guidelines */}
          <Card>
            <CardHeader>
              <CardTitle>Creative Guidelines</CardTitle>
              <CardDescription>
                Follow these guidelines to ensure your submission meets the brand requirements
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm leading-relaxed text-blue-900">{campaign.guidelines}</p>
              </div>
            </CardContent>
          </Card>

          {/* Asset Preview */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Available Assets</CardTitle>
                  <CardDescription>
                    Official brand assets you can use in your creation
                  </CardDescription>
                </div>
                {isActive && (
                  <Link href={`/create?campaign=${campaign.id}`}>
                    <Button variant="outline" size="sm">
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Use in Canvas
                    </Button>
                  </Link>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {campaign.assets.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {campaign.assets.map((asset: any) => (
                    <div key={asset.id} className="group relative">
                      <div className="aspect-square bg-muted rounded-lg overflow-hidden">
                        <img
                          src={asset.url}
                          alt={asset.filename}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      </div>
                      <div className="mt-2 space-y-1">
                        <p className="text-sm font-medium truncate">{asset.filename}</p>
                        <Badge variant="outline" className="text-xs">
                          {asset.category}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Image className="mx-auto h-8 w-8 mb-2" aria-hidden="true" />
                  <p className="text-sm">Assets will be available when the campaign becomes active</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Community Showcase */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Community Showcase</CardTitle>
                  <CardDescription>
                    Amazing submissions from fellow creators
                  </CardDescription>
                </div>
                <Badge variant="outline">
                  {approvedSubmissions.length} approved works
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {submissionsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-sm text-muted-foreground">Loading submissions...</span>
                </div>
              ) : submissionsError ? (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertCircle className="mx-auto h-8 w-8 mb-2 text-red-500" />
                  <p className="text-sm text-red-600">{submissionsError}</p>
                  <p className="text-xs">Please try refreshing the page</p>
                </div>
              ) : approvedSubmissions.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {approvedSubmissions.slice(0, 4).map((submission) => (
                    <div key={submission.id} className="group">
                      <div className="aspect-video bg-muted rounded-lg overflow-hidden mb-3">
                        <img
                          src={submission.artworkUrl}
                          alt={submission.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      </div>
                      <div className="space-y-1">
                        <h3 className="font-medium">{submission.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          By {submission.creator?.displayName || 'Anonymous Creator'}
                        </p>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            <Award className="mr-1 h-3 w-3" />
                            Approved
                          </Badge>
                          {submission.likeCount > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              <Heart className="mr-1 h-3 w-3" />
                              {submission.likeCount}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="mx-auto h-8 w-8 mb-2" />
                  <p className="text-sm">No submissions yet</p>
                  <p className="text-xs">Be the first to create something amazing!</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Campaign Info */}
          <Card>
            <CardHeader>
              <CardTitle>Campaign Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <Badge variant={getStatusColor(campaign.status)}>
                    {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
                  </Badge>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Deadline</span>
                  <span className="text-sm font-medium">
                    {campaign.deadline ? new Date(campaign.deadline).toLocaleDateString() : 'No deadline'}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Time Left</span>
                  <span className={`text-sm font-medium ${daysLeft <= 7 && daysLeft > 0 ? 'text-orange-600' : daysLeft <= 0 ? 'text-red-600' : ''}`}>
                    {daysLeft > 0 ? `${daysLeft} days` : "Campaign ended"}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Participants</span>
                  <span className="text-sm font-medium">{approvedSubmissions.length}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Assets</span>
                  <span className="text-sm font-medium">{campaign.assets.length} files</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Call to Action */}
          {isActive && (
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader>
                <CardTitle className="text-center">Ready to Create?</CardTitle>
                <CardDescription className="text-center">
                  Use the official assets to create your masterpiece
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Link href={`/create?campaign=${campaign.id}`}>
                  <Button className="w-full">
                    <Palette className="mr-2 h-4 w-4" />
                    Start Creating
                  </Button>
                </Link>
                <p className="text-xs text-center text-muted-foreground">
                  Join {approvedSubmissions.length} other creators in this campaign
                </p>
              </CardContent>
            </Card>
          )}

          {/* Brand Info */}
          <Card>
            <CardHeader>
              <CardTitle>About {campaign.brand?.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm space-y-2">
                <p className="text-muted-foreground">
                  This campaign is officially sponsored by {campaign.brand?.name}. 
                  All submissions will be reviewed by their creative team.
                </p>
              </div>
              <div className="pt-2 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Campaign Created</span>
                  <span>{campaign.createdAt ? campaign.createdAt.toLocaleDateString() : 'Unknown'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Last Updated</span>
                  <span>{campaign.updatedAt ? campaign.updatedAt.toLocaleDateString() : 'Unknown'}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tips */}
          <Card>
            <CardHeader>
              <CardTitle>Pro Tips</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 mt-0.5 text-green-600" />
                  <p>Read the guidelines carefully before starting</p>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 mt-0.5 text-green-600" />
                  <p>Use the provided assets creatively</p>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 mt-0.5 text-green-600" />
                  <p>Submit early to get feedback</p>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 mt-0.5 text-green-600" />
                  <p>Follow brand color schemes</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}