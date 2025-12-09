"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Search, SlidersHorizontal } from "lucide-react"

interface Campaign {
  id: string
  title: string
  status: string
  brandId: string
}

export function SubmissionsFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()
  
  // Read values directly from URL - no local state needed
  const searchTerm = searchParams.get('search') || ''
  const statusFilter = searchParams.get('status') || 'pending'
  const sortBy = searchParams.get('sortBy') || 'newest'
  const campaignFilter = searchParams.get('campaignId') || 'all'
  
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [campaignsLoading, setCampaignsLoading] = useState(true)

  // Load campaigns for dropdown
  useEffect(() => {
    const fetchCampaigns = async () => {
      try {
        const response = await fetch('/api/campaigns?limit=100')
        if (response.ok) {
          const data = await response.json()
          setCampaigns(data.campaigns || [])
        }
      } catch (error) {
        console.error('Failed to fetch campaigns:', error)
      } finally {
        setCampaignsLoading(false)
      }
    }

    fetchCampaigns()
  }, [])

  // Helper function to update URL with new params
  const updateURL = (updates: Record<string, string | null>, debounce = false) => {
    const params = new URLSearchParams()
    
    // Build params object with current values and updates
    const newParams = {
      search: searchTerm,
      status: statusFilter,
      sortBy: sortBy !== 'newest' ? sortBy : null,
      campaignId: campaignFilter !== 'all' ? campaignFilter : null,
      ...updates
    }
    
    // Add non-null values to URLSearchParams
    Object.entries(newParams).forEach(([key, value]) => {
      if (value) params.set(key, value)
    })
    
    const url = params.toString() ? `${pathname}?${params.toString()}` : pathname
    
    if (debounce) {
      setTimeout(() => router.push(url), 300)
    } else {
      router.push(url)
    }
  }

  return (
    <div className="space-y-4">
      {/* Search and Sort Row */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search by title, description, or creator..."
            value={searchTerm}
            onChange={(e) => updateURL({ search: e.target.value || null }, true)}
            className="pl-10"
          />
        </div>
        
        <div className="flex gap-2">
          <Select value={sortBy} onValueChange={(value) => updateURL({ sortBy: value })}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="oldest">Oldest First</SelectItem>
              <SelectItem value="title">Title A-Z</SelectItem>
              <SelectItem value="creator">Creator A-Z</SelectItem>
              <SelectItem value="campaign">Campaign A-Z</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={campaignFilter} onValueChange={(value) => updateURL({ campaignId: value })}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Campaigns" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Campaigns</SelectItem>
              {campaignsLoading ? (
                <SelectItem value="loading" disabled>
                  Loading campaigns...
                </SelectItem>
              ) : campaigns.length > 0 ? (
                campaigns.map((campaign) => (
                  <SelectItem key={campaign.id} value={campaign.id}>
                    <div className="flex flex-col">
                      <span className="truncate max-w-[140px]">{campaign.title}</span>
                      <span className="text-xs text-muted-foreground">
                        {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
                      </span>
                    </div>
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="no-campaigns" disabled>
                  No campaigns found
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto">
        <Button
          variant={statusFilter === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => updateURL({ status: "all" })}
        >
          All
        </Button>
        <Button
          variant={statusFilter === "pending" ? "default" : "outline"}
          size="sm"
          onClick={() => updateURL({ status: "pending" })}
          className="relative"
        >
          Pending
          {/* TODO: Add pending count badge */}
        </Button>
        <Button
          variant={statusFilter === "approved" ? "default" : "outline"}
          size="sm"
          onClick={() => updateURL({ status: "approved" })}
        >
          Approved
        </Button>
        <Button
          variant={statusFilter === "rejected" ? "default" : "outline"}
          size="sm"
          onClick={() => updateURL({ status: "rejected" })}
        >
          Rejected
        </Button>
        <Button
          variant={statusFilter === "withdrawn" ? "default" : "outline"}
          size="sm"
          onClick={() => updateURL({ status: "withdrawn" })}
        >
          Withdrawn
        </Button>
      </div>
      
      {/* Active Filters Indicator */}
      {(searchTerm || statusFilter !== 'pending' || sortBy !== 'newest' || campaignFilter !== 'all') && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <SlidersHorizontal className="h-4 w-4" />
          <span>Filters active</span>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => updateURL({ 
              search: null, 
              status: "pending", 
              sortBy: null, 
              campaignId: null 
            })}
            className="h-6 px-2 text-xs"
          >
            Clear all
          </Button>
        </div>
      )}
    </div>
  )
}