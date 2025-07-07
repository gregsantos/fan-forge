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
  Calendar,
  TrendingUp,
  Eye,
  Plus,
  ArrowRight,
  Package,
  Image,
  Upload,
  FolderOpen,
} from "lucide-react"
import Link from "next/link"
import {getDashboardData} from "@/lib/data/campaigns"
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

function getIpKitStatusColor(isPublished: boolean) {
  return isPublished
    ? "bg-gradient-to-r from-green-500 to-emerald-500 text-white border-transparent"
    : "bg-gradient-to-r from-gray-500 to-slate-500 text-white border-transparent"
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

function calculateStats(campaigns: any[], submissions: any[], stats: any) {
  const activeCampaigns = campaigns.filter(c => c.status === "active")
  const totalSubmissions = submissions.length
  const pendingSubmissions = submissions.filter(
    s => s.status === "pending"
  ).length
  const approvedSubmissions = submissions.filter(
    s => s.status === "approved"
  ).length

  return [
    {
      title: "Active Campaigns",
      value: activeCampaigns.length,
      description: "Currently running",
      icon: FileText,
      gradient: "from-gradient-blue to-gradient-cyan",
      iconBg: "bg-gradient-to-br from-gradient-blue/20 to-gradient-cyan/20",
    },
    {
      title: "Total IP Kits",
      value: stats.ipKits.total,
      description: `${stats.ipKits.published} published`,
      icon: Package,
      gradient: "from-green-500 to-emerald-500",
      iconBg: "bg-gradient-to-br from-green-500/20 to-emerald-500/20",
    },
    {
      title: "Total Assets",
      value: stats.assets.total,
      description: "All collections",
      icon: Image,
      gradient: "from-gradient-purple to-gradient-pink",
      iconBg: "bg-gradient-to-br from-gradient-purple/20 to-gradient-pink/20",
    },
    {
      title: "Pending Reviews",
      value: pendingSubmissions,
      description: "Needs attention",
      icon: Eye,
      gradient: "from-orange-500 to-red-500",
      iconBg: "bg-gradient-to-br from-orange-500/20 to-red-500/20",
    },
  ]
}

function formatDate(date: string | Date) {
  const dateObj = typeof date === "string" ? new Date(date) : date
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(dateObj)
}

export default async function BrandDashboardPage() {
  const {
    campaigns,
    submissions,
    ipKits,
    assets,
    stats: dashboardStats,
  } = await getDashboardData()

  const activeCampaigns = campaigns.filter((c: any) => c.status === "active")
  const stats = calculateStats(campaigns, submissions, dashboardStats)

  return (
    <div className='container mx-auto px-4 py-8 max-w-7xl'>
      {/* Header */}
      <div className='flex justify-between items-center mb-8'>
        <div>
          <h1 className='text-3xl font-bold text-foreground'>
            Brand Dashboard
          </h1>
          <p className='text-muted-foreground'>
            Manage your campaigns and review creator submissions
          </p>
        </div>
        <Link href='/campaigns/new'>
          <Button variant='gradient' className='shadow-lg'>
            <Plus className='mr-2 h-4 w-4' />
            New Campaign
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8'>
        {stats.map(stat => (
          <Card
            key={stat.title}
            className='border-0 shadow-lg bg-gradient-to-br from-card via-card to-muted/30 hover:shadow-xl transition-all duration-300'
          >
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium text-muted-foreground'>
                {stat.title}
              </CardTitle>
              <div
                className={`p-3 rounded-xl ${stat.iconBg} backdrop-blur-sm border border-white/20`}
              >
                <stat.icon
                  className={`h-5 w-5 bg-gradient-to-br ${stat.gradient} bg-clip-text text-transparent`}
                />
              </div>
            </CardHeader>
            <CardContent>
              <div
                className={`text-3xl font-bold bg-gradient-to-br ${stat.gradient} bg-clip-text text-transparent`}
              >
                {stat.value}
              </div>
              <p className='text-xs text-muted-foreground mt-1'>
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <Card className='mb-8 border-0 shadow-lg bg-gradient-to-br from-card via-card to-muted/20'>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Common tasks for brand administrators
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4'>
            <Link href='/campaigns/new'>
              <div className='w-full h-20 border border-primary/20 rounded-lg bg-gradient-to-br from-card via-card to-muted/10 hover:shadow-lg hover:bg-gradient-to-br hover:from-card hover:via-card hover:to-muted/20 transition-all duration-300 group cursor-pointer'>
                <div className='w-full h-full flex flex-col items-center justify-center gap-2 text-foreground group-hover:text-primary transition-colors'>
                  <Plus className='h-6 w-6' />
                  <span className='text-sm font-medium'>New Campaign</span>
                </div>
              </div>
            </Link>
            <Link href='/ip-kits/new'>
              <div className='w-full h-20 border border-blue-300/20 rounded-lg bg-gradient-to-br from-card via-card to-muted/10 hover:shadow-lg hover:bg-gradient-to-br hover:from-card hover:via-card hover:to-muted/20 transition-all duration-300 group cursor-pointer'>
                <div className='w-full h-full flex flex-col items-center justify-center gap-2 text-foreground group-hover:text-blue-600 transition-colors'>
                  <Package className='h-6 w-6' />
                  <span className='text-sm font-medium'>New IP Kit</span>
                </div>
              </div>
            </Link>
            <Link href='/assets'>
              <div className='w-full h-20 border border-purple-300/20 rounded-lg bg-gradient-to-br from-card via-card to-muted/10 hover:shadow-lg hover:bg-gradient-to-br hover:from-card hover:via-card hover:to-muted/20 transition-all duration-300 group cursor-pointer'>
                <div className='w-full h-full flex flex-col items-center justify-center gap-2 text-foreground group-hover:text-purple-600 transition-colors'>
                  <Upload className='h-6 w-6' />
                  <span className='text-sm font-medium'>Upload Assets</span>
                </div>
              </div>
            </Link>
            <Link href='/submissions'>
              <div className='w-full h-20 border border-orange-300/20 rounded-lg bg-gradient-to-br from-card via-card to-muted/10 hover:shadow-lg hover:bg-gradient-to-br hover:from-card hover:via-card hover:to-muted/20 transition-all duration-300 group cursor-pointer'>
                <div className='w-full h-full flex flex-col items-center justify-center gap-2 text-foreground group-hover:text-orange-600 transition-colors'>
                  <Eye className='h-6 w-6' />
                  <span className='text-sm font-medium'>
                    Review Submissions
                  </span>
                </div>
              </div>
            </Link>
            <Link href='/analytics'>
              <div className='w-full h-20 border border-green-300/20 rounded-lg bg-gradient-to-br from-card via-card to-muted/10 hover:shadow-lg hover:bg-gradient-to-br hover:from-card hover:via-card hover:to-muted/20 transition-all duration-300 group cursor-pointer'>
                <div className='w-full h-full flex flex-col items-center justify-center gap-2 text-foreground group-hover:text-green-600 transition-colors'>
                  <BarChart3 className='h-6 w-6' />
                  <span className='text-sm font-medium'>View Analytics</span>
                </div>
              </div>
            </Link>
          </div>
        </CardContent>
      </Card>

      <div className='grid grid-cols-1 lg:grid-cols-2 gap-8'>
        {/* Recent Campaigns */}
        <Card className='border-0 shadow-lg bg-gradient-to-br from-card via-card to-muted/20'>
          <CardHeader>
            <div className='flex items-center justify-between'>
              <div>
                <CardTitle>Recent Campaigns</CardTitle>
                <CardDescription>Your latest campaign activity</CardDescription>
              </div>
              <Link href='/campaigns'>
                <Button variant='outline' size='sm'>
                  View All
                  <ArrowRight className='ml-2 h-4 w-4' />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className='space-y-4'>
            {activeCampaigns.slice(0, 3).map((campaign: any) => (
              <div
                key={campaign.id}
                className='flex items-center justify-between p-4 border rounded-lg'
              >
                <div className='space-y-1'>
                  <h3 className='font-medium text-sm'>{campaign.title}</h3>
                  <p className='text-xs text-muted-foreground'>
                    {campaign.submission_count} submissions
                  </p>
                  <div className='flex items-center gap-2'>
                    <Calendar className='h-3 w-3 text-muted-foreground' />
                    <span className='text-xs text-muted-foreground'>
                      Ends{" "}
                      {campaign.deadline
                        ? formatDate(campaign.deadline)
                        : "No deadline"}
                    </span>
                  </div>
                </div>
                <div className='flex flex-col items-end gap-2'>
                  <Badge
                    className={cn(
                      "font-medium shadow-sm capitalize",
                      getCampaignStatusColor(campaign.status)
                    )}
                  >
                    {campaign.status}
                  </Badge>
                  <Link href={`/campaigns/${campaign.id}`}>
                    <Button variant='ghost' size='sm'>
                      <Eye className='h-4 w-4' />
                    </Button>
                  </Link>
                </div>
              </div>
            ))}

            {activeCampaigns.length === 0 && (
              <div className='text-center py-8 text-muted-foreground'>
                <FileText className='mx-auto h-8 w-8 mb-2' />
                <p className='text-sm'>No active campaigns</p>
                <Link href='/campaigns/new'>
                  <Button variant='outline' size='sm' className='mt-2'>
                    Create Your First Campaign
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Ready for Review */}
        <Card className='border-0 shadow-lg bg-gradient-to-br from-card via-card to-muted/20'>
          <CardHeader>
            <div className='flex items-center justify-between'>
              <div>
                <CardTitle>Ready for Review</CardTitle>
                <CardDescription>
                  Creator submissions awaiting your review
                </CardDescription>
              </div>
              <Link href='/submissions'>
                <Button variant='outline' size='sm'>
                  View All
                  <ArrowRight className='ml-2 h-4 w-4' />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className='space-y-4'>
            {submissions
              .filter((submission: any) => submission.status === "pending")
              .slice(0, 3)
              .map((submission: any) => (
                <div
                  key={submission.id}
                  className='flex items-center justify-between p-4 border rounded-lg'
                >
                  <div className='space-y-1'>
                    <h3 className='font-medium text-sm'>{submission.title}</h3>
                    <p className='text-xs text-muted-foreground'>
                      {submission.campaign?.title || "Unknown Campaign"}
                    </p>
                    <p className='text-xs text-muted-foreground'>
                      {submission.createdAt
                        ? formatDate(submission.createdAt)
                        : "Unknown"}
                    </p>
                  </div>
                  <div className='flex flex-col items-end gap-2'>
                    <Badge
                      className={cn(
                        "font-medium shadow-sm capitalize",
                        getSubmissionStatusColor(submission.status)
                      )}
                    >
                      {submission.status}
                    </Badge>
                    <Link href={`/submissions/${submission.id}`}>
                      <Button variant='ghost' size='sm'>
                        <Eye className='h-4 w-4' />
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}

            {submissions.filter(
              (submission: any) => submission.status === "pending"
            ).length === 0 && (
              <div className='text-center py-8 text-muted-foreground'>
                <Users className='mx-auto h-8 w-8 mb-2' />
                <p className='text-sm'>No submissions awaiting review</p>
              </div>
            )}
          </CardContent>
        </Card>
        {/* Recent IP Kits */}
        <Card className='border-0 shadow-lg bg-gradient-to-br from-card via-card to-muted/20'>
          <CardHeader>
            <div className='flex items-center justify-between'>
              <div>
                <CardTitle>Recent IP Kits</CardTitle>
                <CardDescription>
                  Your latest intellectual property collections
                </CardDescription>
              </div>
              <Link href='/ip-kits'>
                <Button variant='outline' size='sm'>
                  View All
                  <ArrowRight className='ml-2 h-4 w-4' />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className='space-y-4'>
            {ipKits.slice(0, 3).map((ipKit: any) => (
              <div
                key={ipKit.id}
                className='flex items-center justify-between p-4 border rounded-lg'
              >
                <div className='space-y-1'>
                  <h3 className='font-medium text-sm'>{ipKit.name}</h3>
                  <p className='text-xs text-muted-foreground'>
                    {ipKit.assetCount} assets
                  </p>
                  <p className='text-xs text-muted-foreground'>
                    {formatDate(ipKit.createdAt)}
                  </p>
                </div>
                <div className='flex flex-col items-end gap-2'>
                  <Badge
                    className={cn(
                      "font-medium shadow-sm",
                      getIpKitStatusColor(ipKit.isPublished)
                    )}
                  >
                    {ipKit.isPublished ? "Published" : "Draft"}
                  </Badge>
                  <Link href={`/ip-kits/${ipKit.id}`}>
                    <Button variant='ghost' size='sm'>
                      <Eye className='h-4 w-4' />
                    </Button>
                  </Link>
                </div>
              </div>
            ))}

            {ipKits.length === 0 && (
              <div className='text-center py-8 text-muted-foreground'>
                <Package className='mx-auto h-8 w-8 mb-2' />
                <p className='text-sm'>No IP kits yet</p>
                <Link href='/ip-kits/new'>
                  <Button variant='outline' size='sm' className='mt-2'>
                    Create Your First IP Kit
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recently Approved */}
        <Card className='border-0 shadow-lg bg-gradient-to-br from-card via-card to-muted/20'>
          <CardHeader>
            <div className='flex items-center justify-between'>
              <div>
                <CardTitle>Recently Approved</CardTitle>
                <CardDescription>
                  Latest approved creator submissions
                </CardDescription>
              </div>
              <Link href='/submissions/?status=approved'>
                <Button variant='outline' size='sm'>
                  View All
                  <ArrowRight className='ml-2 h-4 w-4' />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className='space-y-4'>
            {submissions
              .filter((submission: any) => submission.status === "approved")
              .slice(0, 3)
              .map((submission: any) => (
                <div
                  key={submission.id}
                  className='flex items-center justify-between p-4 border rounded-lg'
                >
                  <div className='space-y-1'>
                    <h3 className='font-medium text-sm'>{submission.title}</h3>
                    <p className='text-xs text-muted-foreground'>
                      {submission.campaign?.title || "Unknown Campaign"}
                    </p>
                    <p className='text-xs text-muted-foreground'>
                      Approved{" "}
                      {submission.createdAt
                        ? formatDate(submission.createdAt)
                        : "Unknown"}
                    </p>
                  </div>
                  <div className='flex flex-col items-end gap-2'>
                    <Badge
                      className={cn(
                        "font-medium shadow-sm capitalize",
                        getSubmissionStatusColor(submission.status)
                      )}
                    >
                      {submission.status}
                    </Badge>
                    <Link href={`/submissions/${submission.id}`}>
                      <Button variant='ghost' size='sm'>
                        <Eye className='h-4 w-4' />
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}

            {submissions.filter(
              (submission: any) => submission.status === "approved"
            ).length === 0 && (
              <div className='text-center py-8 text-muted-foreground'>
                <Users className='mx-auto h-8 w-8 mb-2' />
                <p className='text-sm'>No approved submissions yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
