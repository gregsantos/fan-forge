import {redirect} from "next/navigation"
import {getCurrentUser, getUserBrandIds} from "@/lib/auth-utils"
import {getAnalyticsData} from "@/lib/data/campaigns"
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
  BarChart3,
  Users,
  FileText,
  TrendingUp,
  Eye,
  Package,
  Image,
  Award,
  Calendar,
  Target,
  Activity,
  Zap,
  ArrowRight,
} from "lucide-react"
import Link from "next/link"
import {cn} from "@/lib/utils"

function getCampaignStatusColor(status: string) {
  switch (status) {
    case "active":
      return "bg-gradient-to-r from-green-500 to-emerald-500 text-white border-transparent"
    case "draft":
      return "bg-gradient-to-r from-gray-500 to-slate-500 text-white border-transparent"
    case "closed":
      return "bg-gradient-to-r from-red-500 to-rose-500 text-white border-transparent"
    case "paused":
      return "bg-gradient-to-r from-orange-500 to-amber-500 text-white border-transparent"
    default:
      return "bg-gradient-to-r from-gray-500 to-slate-500 text-white border-transparent"
  }
}

function getSubmissionStatusColor(status: string) {
  switch (status) {
    case "approved":
      return "bg-gradient-to-r from-green-500 to-emerald-500 text-white border-transparent"
    case "pending":
      return "bg-gradient-to-r from-orange-500 to-amber-500 text-white border-transparent"
    case "rejected":
      return "bg-gradient-to-r from-red-500 to-rose-500 text-white border-transparent"
    default:
      return "bg-gradient-to-r from-gray-500 to-slate-500 text-white border-transparent"
  }
}

function getAssetCategoryColor(category: string) {
  switch (category) {
    case "characters":
      return "bg-gradient-to-r from-green-500 to-emerald-500 text-white border-transparent"
    case "backgrounds":
      return "bg-gradient-to-r from-blue-500 to-cyan-500 text-white border-transparent"
    case "logos":
      return "bg-gradient-to-r from-purple-500 to-pink-500 text-white border-transparent"
    case "titles":
      return "bg-gradient-to-r from-orange-500 to-red-500 text-white border-transparent"
    case "props":
      return "bg-gradient-to-r from-indigo-500 to-purple-500 text-white border-transparent"
    case "other":
      return "bg-gradient-to-r from-gray-500 to-slate-500 text-white border-transparent"
    default:
      return "bg-gradient-to-r from-gray-500 to-slate-500 text-white border-transparent"
  }
}

function formatDate(date: string | Date) {
  const dateObj = typeof date === "string" ? new Date(date) : date
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(dateObj)
}

function formatNumber(num: number) {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + "M"
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + "K"
  }
  return num.toString()
}

function calculatePercentage(value: number, total: number) {
  if (total === 0) return 0
  return Math.round((value / total) * 100)
}

export default async function AnalyticsPage() {
  // Get current user (server-side)
  const user = await getCurrentUser()

  if (!user) {
    redirect("/login")
  }

  try {
    // Verify user has brand access
    const userBrandIds = await getUserBrandIds(user.id)
    if (userBrandIds.length === 0) {
      redirect("/dashboard")
    }

    // Fetch analytics data using shared data layer
    const analyticsData = await getAnalyticsData()

    const {overview, campaigns, assets, submissions, creators} = analyticsData

    // Calculate key metrics
    const totalSubmissions = overview.totalSubmissions
    const approvedSubmissions =
      submissions.byStatus.find(s => s.status === "approved")?.count || 0
    const pendingSubmissions =
      submissions.byStatus.find(s => s.status === "pending")?.count || 0
    const approvalRate = calculatePercentage(
      approvedSubmissions,
      totalSubmissions
    )

    const activeCampaigns =
      campaigns.byStatus.find(c => c.status === "active")?.count || 0
    const closedCampaigns =
      campaigns.byStatus.find(c => c.status === "closed")?.count || 0

    return (
      <div className='container mx-auto px-4 py-8 max-w-7xl'>
        {/* Header */}
        <div className='flex justify-between items-center mb-8'>
          <div>
            <h1 className='text-3xl font-bold text-foreground'>
              Brand Analytics
            </h1>
            <p className='text-muted-foreground'>
              Comprehensive insights into your brand&apos;s campaign performance
              and creator engagement
            </p>
          </div>
          <Link href='/dashboard'>
            <Button variant='outline'>
              <ArrowRight className='mr-2 h-4 w-4 rotate-180' />
              Back to Dashboard
            </Button>
          </Link>
        </div>

        {/* Overview Stats */}
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8'>
          <Card className='border-0 shadow-lg bg-gradient-to-br from-card via-card to-muted/30 hover:shadow-xl transition-all duration-300'>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium text-muted-foreground'>
                Total Campaigns
              </CardTitle>
              <div className='p-3 rounded-xl bg-gradient-to-br from-gradient-blue to-gradient-cyan backdrop-blur-sm border border-white/20 shadow-lg'>
                <FileText className='h-4 w-4 text-white' />
              </div>
            </CardHeader>
            <CardContent>
              <div className='text-3xl font-bold bg-gradient-to-br from-gradient-blue to-gradient-cyan bg-clip-text text-transparent'>
                {overview.totalCampaigns}
              </div>
              <p className='text-xs text-muted-foreground mt-1'>
                {activeCampaigns} active
              </p>
            </CardContent>
          </Card>

          <Card className='border-0 shadow-lg bg-gradient-to-br from-card via-card to-muted/30 hover:shadow-xl transition-all duration-300'>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium text-muted-foreground'>
                Total Creators
              </CardTitle>
              <div className='p-3 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 backdrop-blur-sm border border-white/20 shadow-lg'>
                <Users className='h-4 w-4 text-white' />
              </div>
            </CardHeader>
            <CardContent>
              <div className='text-3xl font-bold bg-gradient-to-br from-green-500 to-emerald-500 bg-clip-text text-transparent'>
                {formatNumber(overview.totalCreators)}
              </div>
              <p className='text-xs text-muted-foreground mt-1'>
                Engaged creators
              </p>
            </CardContent>
          </Card>

          <Card className='border-0 shadow-lg bg-gradient-to-br from-card via-card to-muted/30 hover:shadow-xl transition-all duration-300'>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium text-muted-foreground'>
                Total Assets
              </CardTitle>
              <div className='p-3 rounded-xl bg-gradient-to-br from-gradient-purple to-gradient-pink backdrop-blur-sm border border-white/20 shadow-lg'>
                <Image className='h-4 w-4 text-white' />
              </div>
            </CardHeader>
            <CardContent>
              <div className='text-3xl font-bold bg-gradient-to-br from-gradient-purple to-gradient-pink bg-clip-text text-transparent'>
                {formatNumber(overview.totalAssets)}
              </div>
              <p className='text-xs text-muted-foreground mt-1'>
                Available for creators
              </p>
            </CardContent>
          </Card>

          <Card className='border-0 shadow-lg bg-gradient-to-br from-card via-card to-muted/30 hover:shadow-xl transition-all duration-300'>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium text-muted-foreground'>
                Approval Rate
              </CardTitle>
              <div className='p-3 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 backdrop-blur-sm border border-white/20 shadow-lg'>
                <TrendingUp className='h-4 w-4 text-white' />
              </div>
            </CardHeader>
            <CardContent>
              <div className='text-3xl font-bold bg-gradient-to-br from-orange-500 to-red-500 bg-clip-text text-transparent'>
                {approvalRate}%
              </div>
              <p className='text-xs text-muted-foreground mt-1'>
                {approvedSubmissions} approved
              </p>
            </CardContent>
          </Card>
        </div>

        <div className='grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8'>
          {/* Campaign Performance */}
          <Card className='border-0 shadow-lg bg-gradient-to-br from-card via-card to-muted/20'>
            <CardHeader>
              <div className='flex items-center justify-between'>
                <div>
                  <CardTitle>Campaign Performance</CardTitle>
                  <CardDescription>
                    Top performing campaigns by submissions
                  </CardDescription>
                </div>
                <Link href='/campaigns'>
                  <Button
                    variant='outline'
                    size='sm'
                    className='border-primary/30 hover:bg-primary/10 hover:border-primary/50 transition-all'
                  >
                    View All
                    <ArrowRight className='ml-2 h-4 w-4' />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className='space-y-4'>
              {campaigns.topPerforming
                .slice(0, 5)
                .map((item: any, index: number) => (
                  <div
                    key={item.campaign.id}
                    className='flex items-center justify-between p-4 border rounded-lg'
                  >
                    <div className='flex items-center space-x-3'>
                      <div className='w-8 h-8 bg-gradient-to-br from-gradient-blue/20 to-gradient-cyan/20 rounded-full flex items-center justify-center border border-white/20'>
                        <span className='text-sm font-medium bg-gradient-to-br from-gradient-blue to-gradient-cyan bg-clip-text text-transparent'>
                          #{index + 1}
                        </span>
                      </div>
                      <div className='space-y-1'>
                        <h3 className='font-medium text-sm truncate'>
                          {item.campaign.title}
                        </h3>
                        <p className='text-xs text-muted-foreground'>
                          {item.submissionCount} submissions
                        </p>
                      </div>
                    </div>
                    <div className='flex items-center gap-2'>
                      <Badge
                        className={cn(
                          "font-medium shadow-sm capitalize",
                          getCampaignStatusColor(item.campaign.status)
                        )}
                      >
                        {item.campaign.status}
                      </Badge>
                      <Link href={`/campaigns/${item.campaign.id}`}>
                        <Button variant='ghost' size='sm'>
                          <Eye className='h-4 w-4' />
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}

              {campaigns.topPerforming.length === 0 && (
                <div className='text-center py-8 text-muted-foreground'>
                  <FileText className='mx-auto h-8 w-8 mb-2' />
                  <p className='text-sm'>No campaign data available</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Submission Analytics */}
          <Card className='border-0 shadow-lg bg-gradient-to-br from-card via-card to-muted/20'>
            <CardHeader>
              <div className='flex items-center justify-between'>
                <div>
                  <CardTitle>Submission Analytics</CardTitle>
                  <CardDescription>
                    Breakdown by status and trends
                  </CardDescription>
                </div>
                <Link href='/submissions'>
                  <Button
                    variant='outline'
                    size='sm'
                    className='border-secondary/30 hover:bg-secondary/10 hover:border-secondary/50 transition-all'
                  >
                    View All
                    <ArrowRight className='ml-2 h-4 w-4' />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className='space-y-4'>
              {submissions.byStatus.map((item: any) => {
                const percentage = calculatePercentage(
                  item.count,
                  totalSubmissions
                )
                const getStatusGradient = (status: string) => {
                  switch (status) {
                    case "approved":
                      return "from-green-500 to-emerald-500"
                    case "pending":
                      return "from-orange-500 to-amber-500"
                    case "rejected":
                      return "from-red-500 to-rose-500"
                    default:
                      return "from-gray-500 to-slate-500"
                  }
                }

                return (
                  <div key={item.status} className='space-y-3'>
                    <div className='flex justify-between items-center'>
                      <div className='flex items-center gap-2'>
                        <Badge
                          className={cn(
                            "font-medium shadow-sm capitalize",
                            getSubmissionStatusColor(item.status)
                          )}
                        >
                          {item.status}
                        </Badge>
                      </div>
                      <span className='text-sm font-medium text-muted-foreground'>
                        {item.count} ({percentage}%)
                      </span>
                    </div>
                    <div className='w-full bg-muted rounded-full h-2'>
                      <div
                        className={`h-2 rounded-full bg-gradient-to-r ${getStatusGradient(item.status)}`}
                        style={{width: `${percentage}%`}}
                      />
                    </div>
                  </div>
                )
              })}

              {submissions.byStatus.length === 0 && (
                <div className='text-center py-8 text-muted-foreground'>
                  <Activity className='mx-auto h-8 w-8 mb-2' />
                  <p className='text-sm'>No submission data available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className='grid grid-cols-1 lg:grid-cols-2 gap-8'>
          {/* Top Contributors */}
          <Card className='border-0 shadow-lg bg-gradient-to-br from-card via-card to-muted/20'>
            <CardHeader>
              <div className='flex items-center justify-between'>
                <div>
                  <CardTitle>Top Contributors</CardTitle>
                  <CardDescription>
                    Most active creators by submissions
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className='space-y-4'>
              {creators.topContributors
                .slice(0, 5)
                .map((item: any, index: number) => (
                  <div
                    key={item.creator.id}
                    className='flex items-center justify-between p-4 border rounded-lg'
                  >
                    <div className='flex items-center space-x-3'>
                      <div className='w-8 h-8 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-full flex items-center justify-center border border-white/20'>
                        <span className='text-sm font-medium bg-gradient-to-br from-green-500 to-emerald-500 bg-clip-text text-transparent'>
                          #{index + 1}
                        </span>
                      </div>
                      <div className='space-y-1'>
                        <h3 className='font-medium text-sm truncate'>
                          {item.creator.displayName}
                        </h3>
                        <p className='text-xs text-muted-foreground'>
                          {item.submissionCount} submissions
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant='outline'
                      className='border-primary/30 text-primary'
                    >
                      Creator
                    </Badge>
                  </div>
                ))}

              {creators.topContributors.length === 0 && (
                <div className='text-center py-8 text-muted-foreground'>
                  <Users className='mx-auto h-8 w-8 mb-2' />
                  <p className='text-sm'>No creator data available</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Most Popular Assets */}
          <Card className='border-0 shadow-lg bg-gradient-to-br from-card via-card to-muted/20'>
            <CardHeader>
              <div className='flex items-center justify-between'>
                <div>
                  <CardTitle>Most Popular Assets</CardTitle>
                  <CardDescription>
                    Assets most used by creators in submissions
                  </CardDescription>
                </div>
                <Link href='/assets'>
                  <Button
                    variant='outline'
                    size='sm'
                    className='border-secondary/30 hover:bg-secondary/10 hover:border-secondary/50 transition-all'
                  >
                    View All
                    <ArrowRight className='ml-2 h-4 w-4' />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className='space-y-4'>
              {assets.mostUsed.slice(0, 5).map((item: any, index: number) => (
                <div
                  key={item.asset.id}
                  className='flex items-center justify-between p-4 border rounded-lg'
                >
                  <div className='flex items-center space-x-3 flex-1 min-w-0'>
                    <div className='w-8 h-8 bg-gradient-to-br from-gradient-purple/20 to-gradient-pink/20 rounded-full flex items-center justify-center border border-white/20 flex-shrink-0'>
                      <span className='text-sm font-medium bg-gradient-to-br from-gradient-purple to-gradient-pink bg-clip-text text-transparent'>
                        #{index + 1}
                      </span>
                    </div>
                    <div className='flex items-center space-x-3 flex-1 min-w-0'>
                      <div className='w-10 h-10 bg-muted rounded flex-shrink-0 flex items-center justify-center'>
                        {item.asset.thumbnailUrl ? (
                          <img
                            src={item.asset.thumbnailUrl}
                            alt={item.asset.originalFilename}
                            className='w-full h-full object-cover rounded'
                          />
                        ) : (
                          <Image className='h-5 w-5 text-muted-foreground' />
                        )}
                      </div>
                      <div className='space-y-1 min-w-0 flex-1'>
                        <h3 className='font-medium text-sm truncate'>
                          {item.asset.originalFilename}
                        </h3>
                        <p className='text-xs text-muted-foreground truncate'>
                          {item.ipKit?.name || "Global Asset"}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className='flex flex-col items-end gap-2'>
                    <Badge
                      variant='outline'
                      className='border-primary/30 text-primary'
                    >
                      {item.usageCount} uses
                    </Badge>
                    <Badge
                      className={cn(
                        "font-medium shadow-sm capitalize",
                        getAssetCategoryColor(item.asset.category)
                      )}
                    >
                      {item.asset.category}
                    </Badge>
                  </div>
                </div>
              ))}

              {assets.mostUsed.length === 0 && (
                <div className='text-center py-8 text-muted-foreground'>
                  <Zap className='mx-auto h-8 w-8 mb-2' />
                  <p className='text-sm'>No asset usage data available</p>
                  <p className='text-xs text-muted-foreground mt-1'>
                    Assets will appear here once creators start using them in
                    submissions
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    )
  } catch (error) {
    console.error("Failed to load analytics:", error)
    redirect("/dashboard")
  }
}
