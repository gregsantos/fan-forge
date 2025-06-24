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

export function SubmissionsFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()
  
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '')
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'pending')
  const [sortBy, setSortBy] = useState(searchParams.get('sortBy') || 'newest')
  const [campaignFilter, setCampaignFilter] = useState(searchParams.get('campaignId') || 'all')

  // Update URL when filters change with debouncing for search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const params = new URLSearchParams()
      if (searchTerm) params.set('search', searchTerm)
      if (statusFilter) params.set('status', statusFilter)
      if (sortBy !== 'newest') params.set('sortBy', sortBy)
      if (campaignFilter !== 'all') params.set('campaignId', campaignFilter)
      
      const url = params.toString() ? `${pathname}?${params.toString()}` : pathname
      router.push(url)
    }, searchTerm ? 300 : 0) // Debounce search, immediate for others

    return () => clearTimeout(timeoutId)
  }, [searchTerm, statusFilter, sortBy, campaignFilter, router, pathname])

  return (
    <div className="space-y-4">
      {/* Search and Sort Row */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search by title, description, or creator..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex gap-2">
          <Select value={sortBy} onValueChange={setSortBy}>
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
          
          <Select value={campaignFilter} onValueChange={setCampaignFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="All Campaigns" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Campaigns</SelectItem>
              {/* TODO: Dynamically load campaigns */}
              <SelectItem value="campaign1">Campaign 1</SelectItem>
              <SelectItem value="campaign2">Campaign 2</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto">
        <Button
          variant={statusFilter === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setStatusFilter("all")}
        >
          All
        </Button>
        <Button
          variant={statusFilter === "pending" ? "default" : "outline"}
          size="sm"
          onClick={() => setStatusFilter("pending")}
          className="relative"
        >
          Pending
          {/* TODO: Add pending count badge */}
        </Button>
        <Button
          variant={statusFilter === "approved" ? "default" : "outline"}
          size="sm"
          onClick={() => setStatusFilter("approved")}
        >
          Approved
        </Button>
        <Button
          variant={statusFilter === "rejected" ? "default" : "outline"}
          size="sm"
          onClick={() => setStatusFilter("rejected")}
        >
          Rejected
        </Button>
        <Button
          variant={statusFilter === "withdrawn" ? "default" : "outline"}
          size="sm"
          onClick={() => setStatusFilter("withdrawn")}
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
            onClick={() => {
              setSearchTerm('')
              setStatusFilter('pending')
              setSortBy('newest')
              setCampaignFilter('all')
            }}
            className="h-6 px-2 text-xs"
          >
            Clear all
          </Button>
        </div>
      )}
    </div>
  )
}