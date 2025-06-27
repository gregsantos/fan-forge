import { redirect } from "next/navigation"
import { getCurrentUser, getUserBrandIds } from "@/lib/auth-utils"
import { getAnalyticsData } from "@/lib/data/campaigns"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
    return (num / 1000000).toFixed(1) + 'M'
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K'
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

    const {
      overview,
      campaigns,
      assets,
      submissions,
      creators
    } = analyticsData

    // Calculate key metrics
    const totalSubmissions = overview.totalSubmissions
    const approvedSubmissions = submissions.byStatus.find(s => s.status === 'approved')?.count || 0
    const pendingSubmissions = submissions.byStatus.find(s => s.status === 'pending')?.count || 0
    const approvalRate = calculatePercentage(approvedSubmissions, totalSubmissions)

    const activeCampaigns = campaigns.byStatus.find(c => c.status === 'active')?.count || 0
    const closedCampaigns = campaigns.byStatus.find(c => c.status === 'closed')?.count || 0

    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Brand Analytics
            </h1>
            <p className="text-muted-foreground">
              Comprehensive insights into your brand&apos;s campaign performance and creator engagement
            </p>
          </div>
          <Link href="/dashboard">
            <Button variant="outline">
              <ArrowRight className="mr-2 h-4 w-4 rotate-180" />
              Back to Dashboard
            </Button>
          </Link>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Campaigns
              </CardTitle>
              <div className="p-2 rounded-lg bg-blue-100">
                <FileText className="h-4 w-4 text-blue-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overview.totalCampaigns}</div>
              <p className="text-xs text-muted-foreground">
                {activeCampaigns} active
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Creators
              </CardTitle>
              <div className="p-2 rounded-lg bg-green-100">
                <Users className="h-4 w-4 text-green-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(overview.totalCreators)}</div>
              <p className="text-xs text-muted-foreground">
                Engaged creators
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Assets
              </CardTitle>
              <div className="p-2 rounded-lg bg-purple-100">
                <Image className="h-4 w-4 text-purple-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(overview.totalAssets)}</div>
              <p className="text-xs text-muted-foreground">
                Available for creators
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Approval Rate
              </CardTitle>
              <div className="p-2 rounded-lg bg-orange-100">
                <TrendingUp className="h-4 w-4 text-orange-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{approvalRate}%</div>
              <p className="text-xs text-muted-foreground">
                {approvedSubmissions} approved
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Campaign Performance */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Campaign Performance</CardTitle>
                  <CardDescription>Top performing campaigns by submissions</CardDescription>
                </div>
                <Link href="/campaigns">
                  <Button variant="outline" size="sm">
                    View All
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {campaigns.topPerforming.slice(0, 5).map((item: any, index: number) => (
                <div
                  key={item.campaign.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-blue-600">#{index + 1}</span>
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-medium text-sm">{item.campaign.title}</h3>
                      <p className="text-xs text-muted-foreground">
                        {item.submissionCount} submissions
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={item.campaign.status === 'active' ? 'default' : 'secondary'}>
                      {item.campaign.status}
                    </Badge>
                    <Link href={`/campaigns/${item.campaign.id}`}>
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}

              {campaigns.topPerforming.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="mx-auto h-8 w-8 mb-2" />
                  <p className="text-sm">No campaign data available</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Submission Analytics */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Submission Analytics</CardTitle>
                  <CardDescription>Breakdown by status and trends</CardDescription>
                </div>
                <Link href="/submissions">
                  <Button variant="outline" size="sm">
                    View All
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {submissions.byStatus.map((item: any) => {
                const percentage = calculatePercentage(item.count, totalSubmissions)
                const getStatusColor = (status: string) => {
                  switch (status) {
                    case 'approved': return 'bg-green-500'
                    case 'pending': return 'bg-yellow-500'
                    case 'rejected': return 'bg-red-500'
                    default: return 'bg-gray-500'
                  }
                }

                return (
                  <div key={item.status} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="capitalize font-medium">{item.status}</span>
                      <span className="text-muted-foreground">{item.count} ({percentage}%)</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${getStatusColor(item.status)}`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                )
              })}

              {submissions.byStatus.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Activity className="mx-auto h-8 w-8 mb-2" />
                  <p className="text-sm">No submission data available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Top Contributors */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Top Contributors</CardTitle>
                  <CardDescription>Most active creators by submissions</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {creators.topContributors.slice(0, 5).map((item: any, index: number) => (
                <div
                  key={item.creator.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-green-600">#{index + 1}</span>
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-medium text-sm">{item.creator.displayName}</h3>
                      <p className="text-xs text-muted-foreground">
                        {item.submissionCount} submissions
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline">
                    Creator
                  </Badge>
                </div>
              ))}

              {creators.topContributors.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="mx-auto h-8 w-8 mb-2" />
                  <p className="text-sm">No creator data available</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Most Popular Assets */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Most Popular Assets</CardTitle>
                  <CardDescription>Assets most used by creators in submissions</CardDescription>
                </div>
                <Link href="/assets">
                  <Button variant="outline" size="sm">
                    View All
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {assets.mostUsed.slice(0, 5).map((item: any, index: number) => (
                <div
                  key={item.asset.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-purple-600">#{index + 1}</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-muted rounded flex-shrink-0 flex items-center justify-center">
                        {item.asset.thumbnailUrl ? (
                          <img 
                            src={item.asset.thumbnailUrl} 
                            alt={item.asset.originalFilename}
                            className="w-full h-full object-cover rounded"
                          />
                        ) : (
                          <Image className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                      <div className="space-y-1 min-w-0">
                        <h3 className="font-medium text-sm truncate">{item.asset.originalFilename}</h3>
                        <p className="text-xs text-muted-foreground">
                          {item.ipKit?.name || 'Global Asset'}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge variant="outline">
                      {item.usageCount} uses
                    </Badge>
                    <Badge variant="secondary">
                      {item.asset.category}
                    </Badge>
                  </div>
                </div>
              ))}

              {assets.mostUsed.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Zap className="mx-auto h-8 w-8 mb-2" />
                  <p className="text-sm">No asset usage data available</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Assets will appear here once creators start using them in submissions
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