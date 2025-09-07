'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { 
  Star, 
  ThumbsUp, 
  ThumbsDown,
  ChevronDown,
  ChevronUp,
  Verified,
  Camera
} from 'lucide-react'
import { formatDate } from '@/lib/utils'

interface Review {
  id: string
  title: string | null
  content: string
  rating: number
  customerName: string
  verified: boolean
  helpfulCount: number
  notHelpfulCount: number
  createdAt: Date
  merchantReply?: string | null
  merchantRepliedAt?: Date | null
}

interface ReviewSummary {
  totalReviews: number
  averageRating: number
  rating5Count: number
  rating4Count: number
  rating3Count: number
  rating2Count: number
  rating1Count: number
}

interface ProductReviewsProps {
  productId: string
  reviews: Review[]
  summary: ReviewSummary
  onWriteReview?: () => void
}

const StarRating = ({ rating, size = 16 }: { rating: number; size?: number }) => {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`${
            star <= rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
          }`}
          style={{ width: size, height: size }}
        />
      ))}
    </div>
  )
}

const RatingBar = ({ rating, count, total }: { rating: number; count: number; total: number }) => {
  const percentage = total > 0 ? (count / total) * 100 : 0
  
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1 min-w-[60px]">
        <span className="text-sm text-gray-700">{rating}</span>
        <Star className="w-3 h-3 text-yellow-400 fill-current" />
      </div>
      <Progress value={percentage} className="flex-1 h-2" />
      <span className="text-sm text-gray-600 min-w-[40px]">{count}</span>
    </div>
  )
}

const ReviewCard = ({ review }: { review: Review }) => {
  const [showFullReview, setShowFullReview] = useState(false)
  const [voted, setVoted] = useState<'helpful' | 'not-helpful' | null>(null)
  
  const shouldTruncate = review.content.length > 300
  const displayContent = shouldTruncate && !showFullReview 
    ? review.content.substring(0, 300) + '...'
    : review.content

  const handleVote = (type: 'helpful' | 'not-helpful') => {
    // TODO: Implement voting logic
    setVoted(type)
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Review Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
                {review.customerName.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900">{review.customerName}</span>
                  {review.verified && (
                    <Badge variant="secondary" className="flex items-center gap-1 text-xs">
                      <Verified className="w-3 h-3" />
                      Verified Purchase
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <StarRating rating={review.rating} size={14} />
                  <span className="text-sm text-gray-600">{formatDate(review.createdAt)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Review Title */}
          {review.title && (
            <h4 className="font-semibold text-gray-900">{review.title}</h4>
          )}

          {/* Review Content */}
          <div className="space-y-2">
            <p className="text-gray-700 leading-relaxed">
              {displayContent}
            </p>
            
            {shouldTruncate && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFullReview(!showFullReview)}
                className="p-0 h-auto font-medium text-blue-600 hover:text-blue-800"
              >
                {showFullReview ? (
                  <>
                    Show Less <ChevronUp className="w-4 h-4 ml-1" />
                  </>
                ) : (
                  <>
                    Read More <ChevronDown className="w-4 h-4 ml-1" />
                  </>
                )}
              </Button>
            )}
          </div>

          {/* Review Images Placeholder */}
          <div className="flex gap-2">
            {/* TODO: Display review images */}
          </div>

          {/* Merchant Reply */}
          {review.merchantReply && (
            <div className="bg-gray-50 rounded-lg p-4 border-l-4 border-blue-500">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-medium text-gray-900">Response from Merchant</span>
                {review.merchantRepliedAt && (
                  <span className="text-xs text-gray-500">{formatDate(review.merchantRepliedAt)}</span>
                )}
              </div>
              <p className="text-sm text-gray-700">{review.merchantReply}</p>
            </div>
          )}

          {/* Helpfulness Votes */}
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">Was this review helpful?</span>
              <div className="flex items-center gap-2">
                <Button
                  variant={voted === 'helpful' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleVote('helpful')}
                  className="flex items-center gap-1"
                >
                  <ThumbsUp className="w-3 h-3" />
                  <span className="text-xs">Yes ({review.helpfulCount})</span>
                </Button>
                <Button
                  variant={voted === 'not-helpful' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleVote('not-helpful')}
                  className="flex items-center gap-1"
                >
                  <ThumbsDown className="w-3 h-3" />
                  <span className="text-xs">No ({review.notHelpfulCount})</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function ProductReviews({ productId, reviews, summary, onWriteReview }: ProductReviewsProps) {
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'highest' | 'lowest' | 'helpful'>('newest')
  const [showAllReviews, setShowAllReviews] = useState(false)
  
  const displayedReviews = showAllReviews ? reviews : reviews.slice(0, 5)
  const averageRating = summary.averageRating / 100 // Convert from stored format
  
  const sortedReviews = [...displayedReviews].sort((a, b) => {
    switch (sortBy) {
      case 'newest':
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      case 'oldest':
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      case 'highest':
        return b.rating - a.rating
      case 'lowest':
        return a.rating - b.rating
      case 'helpful':
        return b.helpfulCount - a.helpfulCount
      default:
        return 0
    }
  })

  if (summary.totalReviews === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Star className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No reviews yet</h3>
          <p className="text-gray-600 mb-6">Be the first to share your thoughts about this product</p>
          {onWriteReview && (
            <Button onClick={onWriteReview}>
              Write First Review
            </Button>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Reviews Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Customer Reviews</span>
            {onWriteReview && (
              <Button onClick={onWriteReview} size="sm">
                Write a Review
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Overall Rating */}
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="text-4xl font-bold text-gray-900">
                  {averageRating.toFixed(1)}
                </div>
                <div>
                  <StarRating rating={Math.round(averageRating)} size={20} />
                  <p className="text-sm text-gray-600 mt-1">
                    Based on {summary.totalReviews} {summary.totalReviews === 1 ? 'review' : 'reviews'}
                  </p>
                </div>
              </div>
            </div>

            {/* Rating Breakdown */}
            <div className="space-y-2">
              <RatingBar rating={5} count={summary.rating5Count} total={summary.totalReviews} />
              <RatingBar rating={4} count={summary.rating4Count} total={summary.totalReviews} />
              <RatingBar rating={3} count={summary.rating3Count} total={summary.totalReviews} />
              <RatingBar rating={2} count={summary.rating2Count} total={summary.totalReviews} />
              <RatingBar rating={1} count={summary.rating1Count} total={summary.totalReviews} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sort Options */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          Reviews ({summary.totalReviews})
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Sort by:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="text-sm border border-gray-300 rounded-md px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="highest">Highest rating</option>
            <option value="lowest">Lowest rating</option>
            <option value="helpful">Most helpful</option>
          </select>
        </div>
      </div>

      {/* Reviews List */}
      <div className="space-y-4">
        {sortedReviews.map((review) => (
          <ReviewCard key={review.id} review={review} />
        ))}
      </div>

      {/* Show More Button */}
      {reviews.length > 5 && !showAllReviews && (
        <div className="text-center">
          <Button
            variant="outline"
            onClick={() => setShowAllReviews(true)}
          >
            Show All Reviews ({reviews.length})
          </Button>
        </div>
      )}
    </div>
  )
}