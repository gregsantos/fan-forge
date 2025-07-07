"use client"

import { useState, useCallback, useMemo } from "react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  Search,
  Filter,
  Calendar,
  Trash2,
  Edit3,
  ExternalLink,
  Trophy,
  Star,
} from "lucide-react"
import NextImage from "next/image"
import { StoryProtocolLink, StoryProtocolStatus } from "@/components/shared/story-protocol-link"

interface Submission {
  id: string
  title: string
  description: string
  status: "pending" | "approved" | "rejected" | "withdrawn"
  artworkUrl: string
  storyProtocolIpId?: string | null
  createdAt: Date
  updatedAt: Date
  feedback?: string
  campaignId: string
  campaign: {
    title: string
  } | null
}

interface SubmissionsClientProps {
  submissions: Submission[]
}

const statusConfig = {
  pending: {
    label: "Under Review",
    icon: Clock,
    color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  },
  approved: {
    label: "Approved",
    icon: CheckCircle,
    color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  },
  rejected: {
    label: "Needs Changes",
    icon: XCircle,
    color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  },
  withdrawn: {
    label: "Withdrawn",
    icon: Trash2,
    color: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
  },
}

export default function MySubmissionsClient({ submissions }: SubmissionsClientProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "status">("newest")

  // Calculate stats
  const stats = useMemo(() => ({
    total: submissions.length,
    approved: submissions.filter(s => s.status === "approved").length,
    pending: submissions.filter(s => s.status === "pending").length,
    rejected: submissions.filter(s => s.status === "rejected").length,
  }), [submissions])

  // Filter and sort submissions
  const filteredSubmissions = useMemo(() => {
    let filtered = [...submissions]

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(
        submission =>
          submission.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          submission.campaign?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          submission.description?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(submission => submission.status === statusFilter)
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        case "oldest":
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        case "status":
          return a.status.localeCompare(b.status)
        default:
          return 0
      }
    })

    return filtered
  }, [submissions, searchTerm, statusFilter, sortBy])

  const formatDate = useCallback((date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(date)
  }, [])

  const getStatusBadge = useCallback((status: Submission["status"]) => {
    const config = statusConfig[status]
    const Icon = config.icon

    return (
      <Badge variant="secondary" className={config.color}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    )
  }, [])

  // Smart fallback for submission thumbnails
  const getSubmissionThumbnail = (submission: Submission) => {
    return submission.artworkUrl || null
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">My Submissions</h1>
          <p className="text-muted-foreground">
            Track the status of your creative submissions
          </p>
        </div>
        <Button onClick={() => (window.location.href = "/discover")}>
          <ExternalLink className="h-4 w-4 mr-2" />
          Browse Campaigns
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-2xl font-bold text-primary">
              {stats.total}
            </CardTitle>
            <CardDescription>Total Submissions</CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-2xl font-bold text-green-600">
              {stats.approved}
            </CardTitle>
            <CardDescription>Approved Works</CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-2xl font-bold text-yellow-600">
              {stats.pending}
            </CardTitle>
            <CardDescription>Under Review</CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-2xl font-bold text-red-600">
              {stats.rejected}
            </CardTitle>
            <CardDescription>Need Updates</CardDescription>
          </CardHeader>
        </Card>
      </div>

      {/* Achievements Section */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Trophy className="mr-2 h-5 w-5 text-yellow-500" />
            Achievements
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="px-3 py-1">
              <Star className="mr-1 h-3 w-3" />
              First Submission
            </Badge>
            <Badge variant="secondary" className="px-3 py-1">
              <CheckCircle className="mr-1 h-3 w-3" />
              First Approval
            </Badge>
            <Badge variant="outline" className="px-3 py-1 opacity-50">
              <Trophy className="mr-1 h-3 w-3" />5 Approved Works
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search submissions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Under Review</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Needs Changes</SelectItem>
                <SelectItem value="withdrawn">Withdrawn</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={sortBy}
              onValueChange={(value) => setSortBy(value as typeof sortBy)}
            >
              <SelectTrigger className="w-full md:w-48">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
                <SelectItem value="status">By Status</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Submissions Grid */}
      {filteredSubmissions.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="max-w-md mx-auto">
              <Eye className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {submissions.length === 0
                  ? "No submissions yet"
                  : "No submissions match your filters"}
              </h3>
              <p className="text-muted-foreground mb-4">
                {submissions.length === 0
                  ? "Start creating amazing content by joining a campaign!"
                  : "Try adjusting your search or filters to find what you're looking for."}
              </p>
              {submissions.length === 0 && (
                <Button onClick={() => (window.location.href = "/discover")}>
                  Browse Campaigns
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredSubmissions.map((submission) => (
            <Card
              key={submission.id}
              className="hover:shadow-lg transition-shadow"
            >
              <CardHeader className="p-4">
                <div className="aspect-video relative overflow-hidden rounded-lg mb-3">
                  {getSubmissionThumbnail(submission) ? (
                    <NextImage
                      src={getSubmissionThumbnail(submission)!}
                      alt={submission.title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-blue-500 via-purple-600 to-indigo-700 flex items-center justify-center">
                      <div className="text-center text-white p-4">
                        <h3 className="font-bold text-lg mb-2">{submission.title}</h3>
                        <p className="text-sm opacity-90">
                          by {submission.campaign?.title || "Unknown Campaign"}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-lg line-clamp-2">
                      {submission.title}
                    </CardTitle>
                    {getStatusBadge(submission.status)}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Campaign: {submission.campaign?.title || "Unknown Campaign"}
                  </p>
                  <StoryProtocolStatus 
                    ipId={submission.storyProtocolIpId} 
                    submissionStatus={submission.status}
                  />
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {submission.description}
                  </p>

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Submitted {formatDate(submission.createdAt)}</span>
                  </div>

                  {submission.feedback && (
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-sm font-medium mb-1">Feedback:</p>
                      <p className="text-sm text-muted-foreground">
                        {submission.feedback}
                      </p>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" size="sm" className="flex-1" asChild>
                      <a href={`/submission/${submission.id}`}>
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </a>
                    </Button>
                    {submission.status === "rejected" && (
                      <Button variant="outline" size="sm" className="flex-1">
                        <Edit3 className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                    )}
                    <StoryProtocolLink 
                      ipId={submission.storyProtocolIpId}
                      submissionStatus={submission.status}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}