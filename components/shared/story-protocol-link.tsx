import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ExternalLink, Link2 } from "lucide-react"
import { getStoryProtocolExplorerUrl, isValidStoryProtocolIpId } from "@/lib/utils/story-protocol-config"

interface StoryProtocolLinkProps {
  ipId: string | null | undefined
  submissionStatus?: string
  variant?: "button" | "badge" | "link"
  size?: "sm" | "lg"
  className?: string
}

export function StoryProtocolLink({ 
  ipId, 
  submissionStatus,
  variant = "button", 
  size = "sm",
  className = ""
}: StoryProtocolLinkProps) {
  // Only show for approved submissions with valid IP IDs
  if (!isValidStoryProtocolIpId(ipId) || submissionStatus !== "approved") {
    return null
  }

  const explorerUrl = getStoryProtocolExplorerUrl(ipId!)

  const content = (
    <>
      <Link2 className="h-4 w-4 mr-2" />
      View on Story Protocol
      <ExternalLink className="h-3 w-3 ml-1" />
    </>
  )

  if (variant === "badge") {
    return (
      <Badge 
        variant="secondary" 
        className={`cursor-pointer hover:bg-primary/10 transition-colors ${className}`}
        onClick={() => window.open(explorerUrl, '_blank', 'noopener,noreferrer')}
      >
        {content}
      </Badge>
    )
  }

  if (variant === "link") {
    return (
      <a
        href={explorerUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`inline-flex items-center text-primary hover:text-primary/80 transition-colors text-sm ${className}`}
      >
        {content}
      </a>
    )
  }

  // Default button variant
  return (
    <Button
      variant="outline"
      size={size}
      className={`flex-1 ${className}`}
      asChild
    >
      <a
        href={explorerUrl}
        target="_blank"
        rel="noopener noreferrer"
      >
        {content}
      </a>
    </Button>
  )
}

interface StoryProtocolStatusProps {
  ipId: string | null | undefined
  submissionStatus?: string
  showFull?: boolean
}

export function StoryProtocolStatus({ 
  ipId, 
  submissionStatus,
  showFull = false 
}: StoryProtocolStatusProps) {
  if (submissionStatus !== "approved") {
    return null
  }

  if (!isValidStoryProtocolIpId(ipId)) {
    return (
      <div className="flex items-center text-sm text-muted-foreground">
        <Link2 className="h-4 w-4 mr-2" />
        {showFull ? "Story Protocol registration pending" : "Registration pending"}
      </div>
    )
  }

  return (
    <div className="flex items-center text-sm text-green-600">
      <Link2 className="h-4 w-4 mr-2" />
      {showFull ? "Registered on Story Protocol" : "Registered"}
    </div>
  )
}