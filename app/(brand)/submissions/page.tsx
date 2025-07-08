import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {Badge} from "@/components/ui/badge"
import {Button} from "@/components/ui/button"
import {
  Eye,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  FileImage,
  Plus,
} from "lucide-react"
import Link from "next/link"
import {SubmissionsFilters} from "./submissions-filters"
import {SubmissionQueueContainer} from "./submission-queue-container"
import {createSearchParams} from "@/lib/utils"
import {
  getSubmissionQueue,
  getReviewStats,
  getCampaigns,
} from "@/lib/data/campaigns"
import {getCurrentUser, getUserWithRoles, getUserBrandIds} from "@/lib/auth-utils"
import OnboardingModal from "@/components/shared/onboarding-modal"

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

export default async function BrandSubmissionsPage({
  searchParams,
}: {
  searchParams: {[key: string]: string | string[] | undefined}
}) {
  const params = {
    search: Array.isArray(searchParams.search)
      ? searchParams.search[0]
      : searchParams.search,
    status: Array.isArray(searchParams.status)
      ? searchParams.status[0]
      : searchParams.status || "pending",
    campaignId: Array.isArray(searchParams.campaignId)
      ? searchParams.campaignId[0]
      : searchParams.campaignId,
    sortBy: Array.isArray(searchParams.sortBy)
      ? searchParams.sortBy[0]
      : searchParams.sortBy,
    page: Array.isArray(searchParams.page)
      ? searchParams.page[0]
      : searchParams.page || "1",
  }

  try {
    // Get current user and check role
    const user = await getCurrentUser()
    const userWithRoles = user ? await getUserWithRoles(user.id) : null
    const isBrandAdmin = userWithRoles?.roles?.some(
      (r: any) => r.role.name === "brand_admin"
    )
    const brandIds = user ? await getUserBrandIds(user.id) : []
    const showBrandCreation = isBrandAdmin && brandIds.length === 0

    // If user needs to create a brand first, show brand creation UI
    if (showBrandCreation) {
      return (
        <div className='container mx-auto p-6 space-y-8'>
          {/* Header */}
          <div>
            <h1 className='text-3xl font-bold tracking-tight'>Review Queue</h1>
            <p className='text-muted-foreground mt-2'>
              Review and approve creator submissions across all campaigns
            </p>
          </div>

          <Card className='border-0 shadow-lg bg-gradient-to-br from-orange-500/5 via-card to-amber-500/5'>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-amber-500">
                <Eye className="h-8 w-8 text-white" />
              </div>
              <CardTitle className="text-2xl">Create Your Brand First</CardTitle>
              <CardDescription className="text-base">
                To review creator submissions, you need to set up your brand and create campaigns first.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-3 gap-6 text-center">
                <div className="space-y-2">
                  <div className="mx-auto w-12 h-12 rounded-full bg-gradient-to-br from-gradient-blue/20 to-gradient-cyan/20 flex items-center justify-center">
                    <span className="text-gradient-blue font-bold">1</span>
                  </div>
                  <h4 className="font-medium">Create Brand</h4>
                  <p className="text-sm text-muted-foreground">Set up your brand identity and information</p>
                </div>
                <div className="space-y-2">
                  <div className="mx-auto w-12 h-12 rounded-full bg-gradient-to-br from-gradient-purple/20 to-gradient-pink/20 flex items-center justify-center">
                    <span className="text-gradient-purple font-bold">2</span>
                  </div>
                  <h4 className="font-medium">Launch Campaigns</h4>
                  <p className="text-sm text-muted-foreground">Create campaigns for creators to participate</p>
                </div>
                <div className="space-y-2">
                  <div className="mx-auto w-12 h-12 rounded-full bg-gradient-to-br from-orange-500/20 to-amber-500/20 flex items-center justify-center">
                    <span className="text-orange-600 font-bold">3</span>
                  </div>
                  <h4 className="font-medium">Review Submissions</h4>
                  <p className="text-sm text-muted-foreground">Approve and manage creator work</p>
                </div>
              </div>
              
              <div className="flex justify-center">
                <OnboardingModal 
                  trigger={
                    <Button variant='gradient' size="lg" className='shadow-lg'>
                      <Plus className='mr-2 h-5 w-5' />
                      Create Your Brand
                    </Button>
                  }
                />
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }

    // Fetch submissions queue data, review statistics, and campaigns
    const [queueData, reviewStats, campaignsData] = await Promise.all([
      getSubmissionQueue(params),
      getReviewStats(),
      getCampaigns({limit: "1"}), // Just check if any campaigns exist
    ])

    const {submissions, pagination} = queueData
    const hasCampaigns = campaignsData.campaigns.length > 0

    return (
      <div className='container mx-auto p-6 space-y-8'>
        {/* Header */}
        <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4'>
          <div>
            <h1 className='text-3xl font-bold tracking-tight'>Review Queue</h1>
            <p className='text-muted-foreground mt-2'>
              Review and approve creator submissions across all campaigns
            </p>
          </div>
        </div>

        {/* Filters */}
        <SubmissionsFilters />

        {/* Statistics Cards */}
        <div className='grid grid-cols-1 md:grid-cols-5 gap-6'>
          <Card className='border-0 shadow-lg bg-gradient-to-br from-card via-card to-muted/30 hover:shadow-xl transition-all duration-300'>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium text-muted-foreground'>
                Total Submissions
              </CardTitle>
              <div className='p-3 rounded-xl bg-gradient-to-br from-gradient-blue to-gradient-cyan backdrop-blur-sm border border-white/20 shadow-lg'>
                <FileImage className='h-4 w-4 text-white' />
              </div>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold bg-gradient-to-br from-gradient-blue to-gradient-cyan bg-clip-text text-transparent'>
                {pagination.total}
              </div>
            </CardContent>
          </Card>

          <Card className='border-0 shadow-lg bg-gradient-to-br from-card via-card to-muted/30 hover:shadow-xl transition-all duration-300'>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium text-muted-foreground'>
                Pending Review
              </CardTitle>
              <div className='p-3 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 backdrop-blur-sm border border-white/20 shadow-lg'>
                <Eye className='h-4 w-4 text-white' />
              </div>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold bg-gradient-to-br from-orange-500 to-red-500 bg-clip-text text-transparent'>
                {reviewStats.pending}
              </div>
              <p className='text-xs text-muted-foreground'>
                Across all campaigns
              </p>
            </CardContent>
          </Card>

          <Card className='border-0 shadow-lg bg-gradient-to-br from-card via-card to-muted/30 hover:shadow-xl transition-all duration-300'>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium text-muted-foreground'>
                Approved
              </CardTitle>
              <div className='p-3 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 backdrop-blur-sm border border-white/20 shadow-lg'>
                <ThumbsUp className='h-4 w-4 text-white' />
              </div>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold bg-gradient-to-br from-green-500 to-emerald-500 bg-clip-text text-transparent'>
                {reviewStats.approved}
              </div>
              <p className='text-xs text-muted-foreground'>
                +{reviewStats.recentReviews} this month
              </p>
            </CardContent>
          </Card>

          <Card className='border-0 shadow-lg bg-gradient-to-br from-card via-card to-muted/30 hover:shadow-xl transition-all duration-300'>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium text-muted-foreground'>
                Rejected
              </CardTitle>
              <div className='p-3 rounded-xl bg-gradient-to-br from-red-500 to-pink-500 backdrop-blur-sm border border-white/20 shadow-lg'>
                <ThumbsDown className='h-4 w-4 text-white' />
              </div>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold bg-gradient-to-br from-red-500 to-pink-500 bg-clip-text text-transparent'>
                {reviewStats.rejected}
              </div>
            </CardContent>
          </Card>

          <Card className='border-0 shadow-lg bg-gradient-to-br from-card via-card to-muted/30 hover:shadow-xl transition-all duration-300'>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium text-muted-foreground'>
                Withdrawn
              </CardTitle>
              <div className='p-3 rounded-xl bg-gradient-to-br from-gray-500 to-slate-500 backdrop-blur-sm border border-white/20 shadow-lg'>
                <MessageSquare className='h-4 w-4 text-white' />
              </div>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold bg-gradient-to-br from-gray-500 to-slate-500 bg-clip-text text-transparent'>
                {reviewStats.withdrawn}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Submission Queue with Selection */}
        <SubmissionQueueContainer submissions={submissions} />

        {/* Empty State */}
        {submissions.length === 0 && (
          <div className='text-center py-12'>
            <FileImage className='h-16 w-16 text-muted-foreground mx-auto mb-4' />
            <h3 className='text-lg font-semibold mb-2'>No submissions found</h3>
            <p className='text-muted-foreground mb-4'>
              {!hasCampaigns
                ? "You need to create a campaign first to start receiving submissions from creators."
                : params.search || params.status !== "all"
                  ? "Try adjusting your filters to see more results."
                  : "No submissions have been made yet. Share your campaigns with creators to get started."}
            </p>
            {!hasCampaigns &&
              (isBrandAdmin ? (
                <Link href='/campaigns/new'>
                  <Button variant='gradient'>
                    <Plus className='mr-2 h-4 w-4' />
                    Create Your First Campaign
                  </Button>
                </Link>
              ) : (
                <Link href='/dashboard'>
                  <Button variant='gradient'>
                    <Plus className='mr-2 h-4 w-4' />
                    Go to Dashboard to Get Started
                  </Button>
                </Link>
              ))}
          </div>
        )}

        {/* Pagination */}
        {submissions.length > 0 && pagination.pages > 1 && (
          <div className='flex justify-center gap-2'>
            {Array.from({length: pagination.pages}, (_, i) => i + 1).map(
              page => (
                <Button
                  key={page}
                  variant={page === pagination.page ? "default" : "outline"}
                  size='sm'
                  asChild
                >
                  <Link
                    href={`?${createSearchParams({...params, page: page.toString()}).toString()}`}
                  >
                    {page}
                  </Link>
                </Button>
              )
            )}
          </div>
        )}
      </div>
    )
  } catch (error) {
    console.error("Error loading submissions page:", error)
    return (
      <div className='container mx-auto p-6'>
        <div className='text-center py-12'>
          <h1 className='text-2xl font-bold text-red-600 mb-4'>
            Error Loading Submissions
          </h1>
          <p className='text-muted-foreground mb-4'>
            There was an error loading the submissions page. Please try again
            later.
          </p>
          <p className='text-sm text-muted-foreground'>
            Error: {error instanceof Error ? error.message : "Unknown error"}
          </p>
        </div>
      </div>
    )
  }
}
