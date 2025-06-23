import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Calendar, Star, MessageSquare, Eye, User } from "lucide-react"

function formatDate(date: string | Date) {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(dateObj)
}

function getStatusColor(status: string) {
  switch (status) {
    case "approved":
      return "default"
    case "pending":
      return "secondary"
    case "rejected":
      return "destructive"
    case "withdrawn":
      return "outline"
    default:
      return "secondary"
  }
}

interface ReviewHistoryPanelProps {
  reviews: any[]
}

export function ReviewHistoryPanel({ reviews }: ReviewHistoryPanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <MessageSquare className="h-5 w-5" />
          Review History
        </CardTitle>
        <CardDescription>
          Complete audit trail of all review actions for this submission
        </CardDescription>
      </CardHeader>
      <CardContent>
        {reviews.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Eye className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No reviews yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {reviews.map((review, index) => (
              <div 
                key={review.id} 
                className={`p-4 rounded-lg border ${
                  index === 0 ? 'bg-muted/50' : 'bg-background'
                }`}
              >
                {/* Review Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={review.reviewer?.avatarUrl} />
                      <AvatarFallback>
                        {review.reviewer?.displayName?.[0] || <User className="h-4 w-4" />}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-sm">
                        {review.reviewer?.displayName || 'Unknown Reviewer'}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>{formatDate(review.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={getStatusColor(review.status) as any} className="text-xs">
                      {review.status.charAt(0).toUpperCase() + review.status.slice(1)}
                    </Badge>
                    {review.rating && (
                      <div className="flex items-center gap-1 text-xs">
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        <span>{review.rating}/5</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Review Content */}
                {review.feedback && (
                  <div className="mb-3">
                    <p className="text-sm font-medium mb-1">Feedback</p>
                    <p className="text-sm text-muted-foreground">{review.feedback}</p>
                  </div>
                )}

                {review.internalNotes && (
                  <div className="p-3 bg-muted/30 rounded border">
                    <p className="text-xs font-medium mb-1 text-muted-foreground uppercase tracking-wide">
                      Internal Notes
                    </p>
                    <p className="text-sm text-muted-foreground">{review.internalNotes}</p>
                  </div>
                )}

                {index === 0 && reviews.length > 1 && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-xs text-muted-foreground">Most recent review</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}