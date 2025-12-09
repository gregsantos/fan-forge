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
  Plus,
  Calendar,
  Users,
  Eye,
  Edit,
  MoreHorizontal,
  FileText,
} from "lucide-react"
import Link from "next/link"
import {CampaignFilters} from "./campaign-filters"
import {createSearchParams} from "@/lib/utils"
import {getCampaigns} from "@/lib/data/campaigns"
import {getCurrentUser, getUserWithRoles, getUserBrandIds} from "@/lib/auth-utils"
import OnboardingModal from "@/components/shared/onboarding-modal"

function getStatusColor(status: string) {
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

export default async function BrandCampaignsPage({
  searchParams,
}: {
  searchParams: Promise<{[key: string]: string | string[] | undefined}>
}) {
  const resolvedSearchParams = await searchParams
  const params = {
    search: Array.isArray(resolvedSearchParams.search)
      ? resolvedSearchParams.search[0]
      : resolvedSearchParams.search,
    status: Array.isArray(resolvedSearchParams.status)
      ? resolvedSearchParams.status[0]
      : resolvedSearchParams.status,
    page: Array.isArray(resolvedSearchParams.page)
      ? resolvedSearchParams.page[0]
      : resolvedSearchParams.page || "1",
  }

  // Get current user and check role
  const user = await getCurrentUser()
  
  // Clear cache to ensure fresh data (fixes brand creation redirect timing)
  if (user) {
    const { clearUserRoleCache } = await import('@/lib/auth-utils')
    clearUserRoleCache(user.id)
  }
  
  const userWithRoles = user ? await getUserWithRoles(user.id, false) : null // Force fresh query
  const isBrandAdmin = userWithRoles?.roles?.some((r: any) => r.role.name === "brand_admin")
  const brandIds = user ? await getUserBrandIds(user.id, false) : [] // Force fresh query
  const showBrandCreation = isBrandAdmin && brandIds.length === 0

  const data = await getCampaigns(params)
  const {campaigns, pagination} = data
  const hasCampaigns = campaigns.length > 0

  return (
    <div className='container mx-auto p-6 space-y-8'>
      {/* Header */}
      <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4'>
        <div>
          <h1 className='text-3xl font-bold tracking-tight'>Campaigns</h1>
          <p className='text-muted-foreground mt-2'>
            Manage your brand&apos;s creative campaigns and track submissions
          </p>
        </div>
        {!showBrandCreation && (
          <Link href='/campaigns/new'>
            <Button variant='gradient' className='flex items-center gap-2'>
              <Plus className='h-4 w-4' />
              Create Campaign
            </Button>
          </Link>
        )}
      </div>

      {/* Filters */}
      {!showBrandCreation && <CampaignFilters />}

      {/* Brand Creation Message */}
      {showBrandCreation && (
        <Card className='border-0 shadow-lg bg-gradient-to-br from-gradient-blue/5 via-card to-gradient-cyan/5'>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-gradient-blue to-gradient-cyan">
                <FileText className="h-8 w-8 text-white" />
              </div>
              <CardTitle className="text-2xl">Create Your Brand First</CardTitle>
              <CardDescription className="text-base">
                To create campaigns and manage your brand content, you need to set up your brand identity first.
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
                  <h4 className="font-medium">Upload Assets</h4>
                  <p className="text-sm text-muted-foreground">Upload and organize your brand assets</p>
                </div>
                <div className="space-y-2">
                  <div className="mx-auto w-12 h-12 rounded-full bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center">
                    <span className="text-green-600 font-bold">3</span>
                  </div>
                  <h4 className="font-medium">Launch Campaigns</h4>
                  <p className="text-sm text-muted-foreground">Create campaigns for creators to participate</p>
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
      )}

      {/* Campaign Grid */}
      {!showBrandCreation && (
        <div className='grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6'>
        {campaigns.map((campaign: any) => (
          <Card
            key={campaign.id}
            className='group border-0 shadow-lg bg-gradient-to-br from-card via-card to-muted/30 hover:shadow-xl transition-all duration-300'
          >
            <CardHeader className='space-y-4'>
              <div className='flex items-start justify-between'>
                <Badge
                  className={`font-medium shadow-sm ${getStatusColor(campaign.status)}`}
                >
                  {getStatusText(campaign.status)}
                </Badge>
                <div className='flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity'>
                  <Link href={`/campaigns/${campaign.id}`}>
                    <Button variant='ghost' size='sm'>
                      <Eye className='h-4 w-4' />
                    </Button>
                  </Link>
                  <Link href={`/campaigns/${campaign.id}/edit`}>
                    <Button variant='ghost' size='sm'>
                      <Edit className='h-4 w-4' />
                    </Button>
                  </Link>
                  <Button variant='ghost' size='sm'>
                    <MoreHorizontal className='h-4 w-4' />
                  </Button>
                </div>
              </div>
              <div>
                <CardTitle className='text-xl mb-2 line-clamp-2'>
                  {campaign.title}
                </CardTitle>
                <CardDescription className='line-clamp-3'>
                  {campaign.description}
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent className='pt-0 space-y-4'>
              <div className='text-sm text-muted-foreground'>
                <span className='font-medium'>{campaign.brand_name}</span>
              </div>

              <div className='flex items-center justify-between text-sm'>
                <div className='flex items-center gap-2'>
                  <Calendar className='h-4 w-4 text-muted-foreground' />
                  <span>
                    {campaign.deadline
                      ? formatDate(campaign.deadline)
                      : "No deadline"}
                  </span>
                </div>
                {campaign.featured && (
                  <Badge variant='outline' className='text-xs'>
                    Featured
                  </Badge>
                )}
              </div>

              <div className='flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2 border-t'>
                <div className='flex flex-wrap items-center gap-4 text-sm text-muted-foreground'>
                  <div className='flex items-center gap-1'>
                    <FileText className='h-4 w-4' />
                    <span>{campaign.asset_count} assets</span>
                  </div>
                  <div className='flex items-center gap-1'>
                    <Users className='h-4 w-4' />
                    <span>{campaign.submission_count} submissions</span>
                  </div>
                </div>
                <Link
                  href={`/campaigns/${campaign.id}`}
                  className='w-full sm:w-auto'
                >
                  <Button
                    variant='outline'
                    size='sm'
                    className='w-full sm:w-auto'
                  >
                    View Details
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
        </div>
      )}

      {/* Empty State */}
      {!showBrandCreation && campaigns.length === 0 && (
        <div className='text-center py-12'>
          <FileText className='mx-auto h-12 w-12 text-muted-foreground mb-4' />
          <h3 className='text-lg font-medium mb-2'>No campaigns found</h3>
          <p className='text-muted-foreground mb-4'>
            {params.search || (params.status && params.status !== "all")
              ? "Try adjusting your search or filters"
              : "Create your first campaign to get started"}
          </p>
          {!(params.search || (params.status && params.status !== "all")) && (
            <Link href='/campaigns/new'>
              <Button variant='gradient'>
                <Plus className='mr-2 h-4 w-4' />
                Create Your First Campaign
              </Button>
            </Link>
          )}
        </div>
      )}

      {/* Pagination */}
      {campaigns.length > 0 && pagination.pages > 1 && (
        <div className='flex justify-center gap-2'>
          {Array.from({length: pagination.pages}, (_, i) => i + 1).map(page => (
            <Link
              key={page}
              href={`?${createSearchParams({...params, page: page.toString()}).toString()}`}
            >
              <Button
                variant={page === pagination.page ? "default" : "outline"}
                size='sm'
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
