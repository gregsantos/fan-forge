import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  Eye, 
  ThumbsUp, 
  ThumbsDown, 
  MessageSquare,
  Download,
  Calendar,
  User,
  FileImage
} from "lucide-react"
import Link from "next/link"
import { SubmissionsFilters } from "./submissions-filters"
import { createSearchParams } from "@/lib/utils"

async function getSubmissions(searchParams: Record<string, string | undefined>) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
  const url = new URL(`${baseUrl}/api/submissions`)
  
  Object.entries(searchParams).forEach(([key, value]) => {
    if (value) {
      url.searchParams.set(key, value)
    }
  })

  const response = await fetch(url.toString(), { cache: 'no-store' })
  
  if (!response.ok) {
    throw new Error('Failed to fetch submissions')
  }

  return response.json()
}

function getStatusColor(status: string) {
  switch (status) {
    case "approved":
      return "default"
    case "pending":
      return "secondary"
    case "rejected":
      return "destructive"
    default:
      return "secondary"
  }
}

function getStatusText(status: string) {
  return status.charAt(0).toUpperCase() + status.slice(1)
}

function formatDate(date: string | Date) {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(dateObj)
}

export default async function BrandSubmissionsPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  const params = {
    search: Array.isArray(searchParams.search) ? searchParams.search[0] : searchParams.search,
    status: Array.isArray(searchParams.status) ? searchParams.status[0] : searchParams.status,
    page: Array.isArray(searchParams.page) ? searchParams.page[0] : searchParams.page || '1',
  }

  const data = await getSubmissions(params)
  const { submissions, pagination } = data

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Submissions</h1>
          <p className="text-muted-foreground mt-2">
            Review and approve creator submissions across all campaigns
          </p>
        </div>
      </div>

      {/* Filters */}
      <SubmissionsFilters />

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Submissions
            </CardTitle>
            <FileImage className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pagination.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending Review
            </CardTitle>
            <Eye className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {submissions.filter((s: any) => s.status === "pending").length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Approved
            </CardTitle>
            <ThumbsUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {submissions.filter((s: any) => s.status === "approved").length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Rejected
            </CardTitle>
            <ThumbsDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {submissions.filter((s: any) => s.status === "rejected").length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Submissions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {submissions.map((submission: any) => (
          <Card key={submission.id} className="group hover:shadow-lg transition-all duration-200">
            <div className="aspect-video bg-muted rounded-t-lg overflow-hidden">
              <img
                src={submission.artworkUrl}
                alt={submission.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
              />
            </div>
            
            <CardHeader className="space-y-4">
              <div className="flex items-start justify-between">
                <Badge variant={getStatusColor(submission.status) as any}>
                  {getStatusText(submission.status)}
                </Badge>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="sm">
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Download className="h-4 w-4" />
                  </Button>
                  {submission.status === "pending" && (
                    <>
                      <Button variant="ghost" size="sm">
                        <ThumbsUp className="h-4 w-4 text-green-600" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <ThumbsDown className="h-4 w-4 text-red-600" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
              <div>
                <CardTitle className="text-lg mb-2 line-clamp-2">{submission.title}</CardTitle>
                <CardDescription className="line-clamp-2">
                  {submission.description || "No description provided"}
                </CardDescription>
              </div>
            </CardHeader>
            
            <CardContent className="pt-0 space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>{submission.creator?.displayName || 'Unknown Creator'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>{formatDate(submission.createdAt)}</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  Campaign: {submission.campaign?.title || 'Unknown Campaign'}
                </div>
              </div>
              
              {submission.feedback && (
                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Feedback</span>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {submission.feedback}
                  </p>
                </div>
              )}
              
              <div className="flex items-center justify-between pt-2 border-t">
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  {submission.viewCount !== undefined && (
                    <div className="flex items-center gap-1">
                      <Eye className="h-4 w-4" />
                      <span>{submission.viewCount}</span>
                    </div>
                  )}
                  {submission.likeCount !== undefined && (
                    <div className="flex items-center gap-1">
                      <ThumbsUp className="h-4 w-4" />
                      <span>{submission.likeCount}</span>
                    </div>
                  )}
                </div>
                <Button variant="outline" size="sm">
                  Review
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {submissions.length === 0 && (
        <div className="text-center py-12">
          <FileImage className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No submissions found</h3>
          <p className="text-muted-foreground mb-4">
            {params.search || params.status !== 'all' 
              ? 'Try adjusting your filters to see more results.'
              : 'No submissions have been made yet.'
            }
          </p>
        </div>
      )}

      {/* Pagination */}
      {submissions.length > 0 && pagination.pages > 1 && (
        <div className="flex justify-center gap-2">
          {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((page) => (
            <Link 
              key={page} 
              href={`?${createSearchParams({ ...params, page: page.toString() }).toString()}`}
            >
              <Button 
                variant={page === pagination.page ? "default" : "outline"} 
                size="sm"
              >
                {page}
              </Button>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}