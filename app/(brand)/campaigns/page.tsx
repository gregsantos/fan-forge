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

function getStatusColor(status: string) {
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
  searchParams: {[key: string]: string | string[] | undefined}
}) {
  const params = {
    search: Array.isArray(searchParams.search)
      ? searchParams.search[0]
      : searchParams.search,
    status: Array.isArray(searchParams.status)
      ? searchParams.status[0]
      : searchParams.status,
    page: Array.isArray(searchParams.page)
      ? searchParams.page[0]
      : searchParams.page || "1",
  }

  const data = await getCampaigns(params)
  const {campaigns, pagination} = data

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
        <Link href='/campaigns/new'>
          <Button className='flex items-center gap-2'>
            <Plus className='h-4 w-4' />
            Create Campaign
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <CampaignFilters />

      {/* Campaign Grid */}
      <div className='grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6'>
        {campaigns.map((campaign: any) => (
          <Card
            key={campaign.id}
            className='group hover:shadow-lg transition-all duration-200'
          >
            <CardHeader className='space-y-4'>
              <div className='flex items-start justify-between'>
                <Badge variant={getStatusColor(campaign.status) as any}>
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

      {/* Empty State */}
      {campaigns.length === 0 && (
        <div className='text-center py-12'>
          <FileText className='h-16 w-16 text-muted-foreground mx-auto mb-4' />
          <h3 className='text-lg font-semibold mb-2'>No campaigns found</h3>
          <p className='text-muted-foreground mb-4'>
            {params.search || params.status !== "all"
              ? "Try adjusting your filters to see more results."
              : "Get started by creating your first campaign."}
          </p>
          <Link href='/campaigns/new'>
            <Button>
              <Plus className='mr-2 h-4 w-4' />
              Create Campaign
            </Button>
          </Link>
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
