import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  BarChart3, 
  Users, 
  FileText, 
  Calendar, 
  TrendingUp, 
  Eye, 
  Plus,
  ArrowRight
} from "lucide-react"
import Link from "next/link"
import { getDashboardData } from "@/lib/data/campaigns"

function calculateStats(campaigns: any[], submissions: any[]) {
  const activeCampaigns = campaigns.filter(c => c.status === "active")
  const totalSubmissions = submissions.length
  const pendingSubmissions = submissions.filter(s => s.status === "pending").length
  const approvedSubmissions = submissions.filter(s => s.status === "approved").length

  return [
    {
      title: "Active Campaigns",
      value: activeCampaigns.length,
      description: "Currently running",
      icon: FileText,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    {
      title: "Total Submissions",
      value: totalSubmissions,
      description: "All time",
      icon: Users,
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
    {
      title: "Pending Reviews",
      value: pendingSubmissions,
      description: "Needs attention",
      icon: Eye,
      color: "text-orange-600",
      bgColor: "bg-orange-100",
    },
    {
      title: "Approved Works",
      value: approvedSubmissions,
      description: "This month",
      icon: TrendingUp,
      color: "text-purple-600",
      bgColor: "bg-purple-100",
    },
  ]
}

function formatDate(date: string | Date) {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(dateObj)
}

export default async function BrandDashboardPage() {
  const { campaigns, submissions } = await getDashboardData()
  
  const activeCampaigns = campaigns.filter((c: any) => c.status === "active")
  const stats = calculateStats(campaigns, submissions)

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Brand Dashboard</h1>
          <p className="text-muted-foreground">
            Manage your campaigns and review creator submissions
          </p>
        </div>
        <Link href="/campaigns/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Campaign
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Campaigns */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent Campaigns</CardTitle>
                <CardDescription>
                  Your latest campaign activity
                </CardDescription>
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
            {activeCampaigns.slice(0, 3).map((campaign: any) => (
              <div key={campaign.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <h3 className="font-medium text-sm">{campaign.title}</h3>
                  <p className="text-xs text-muted-foreground">
                    {campaign.submission_count} submissions
                  </p>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      Ends {campaign.deadline ? formatDate(campaign.deadline) : 'No deadline'}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge 
                    variant={campaign.status === "active" ? "default" : "secondary"}
                  >
                    {campaign.status}
                  </Badge>
                  <Link href={`/campaigns/${campaign.id}`}>
                    <Button variant="ghost" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            ))}

            {activeCampaigns.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="mx-auto h-8 w-8 mb-2" />
                <p className="text-sm">No active campaigns</p>
                <Link href="/campaigns/new">
                  <Button variant="outline" size="sm" className="mt-2">
                    Create Your First Campaign
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Submissions */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent Submissions</CardTitle>
                <CardDescription>
                  Latest creator submissions awaiting review
                </CardDescription>
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
            {submissions.slice(0, 3).map((submission: any) => (
              <div key={submission.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <h3 className="font-medium text-sm">{submission.title}</h3>
                  <p className="text-xs text-muted-foreground">
                    {submission.campaign?.title || 'Unknown Campaign'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {submission.createdAt ? formatDate(submission.createdAt) : 'Unknown'}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge 
                    variant={
                      submission.status === "approved" ? "default" :
                      submission.status === "pending" ? "secondary" : 
                      "destructive"
                    }
                  >
                    {submission.status}
                  </Badge>
                  <Link href={`/submissions`}>
                    <Button variant="ghost" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            ))}

            {submissions.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="mx-auto h-8 w-8 mb-2" />
                <p className="text-sm">No submissions yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Common tasks for brand administrators
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link href="/campaigns/new">
              <Button variant="outline" className="w-full h-20 flex flex-col gap-2">
                <Plus className="h-6 w-6" />
                <span>Create Campaign</span>
              </Button>
            </Link>
            <Link href="/submissions">
              <Button variant="outline" className="w-full h-20 flex flex-col gap-2">
                <Eye className="h-6 w-6" />
                <span>Review Submissions</span>
              </Button>
            </Link>
            <Link href="/campaigns">
              <Button variant="outline" className="w-full h-20 flex flex-col gap-2">
                <BarChart3 className="h-6 w-6" />
                <span>View Analytics</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}