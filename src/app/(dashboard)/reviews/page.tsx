'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { TonalCard } from '@/src/components/shared/Cards';
import { LoadingState, ErrorState, EmptyState } from '@/src/components/shared/QueryStates';
import { reviewsApi, qk } from '@/src/lib/api/vendor';
import { formatRelative } from '@/src/lib/format';
import { Star, MessageSquare } from 'lucide-react';

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex text-yellow-500">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className={`w-4 h-4 ${i < Math.round(rating) ? 'fill-current' : 'text-gray-200'}`} />
      ))}
    </div>
  );
}

export default function ReviewsPage() {
  const query = useQuery({ queryKey: qk.reviews(), queryFn: reviewsApi.list });
  const reviews = query.data ?? [];

  const ratings = reviews
    .map((r) => r.vendorRating ?? r.foodRating)
    .filter((v): v is number => typeof v === 'number');
  const avg = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-foreground)]">Customer Reviews</h1>
        <p className="text-sm text-[var(--color-muted-foreground)]">See what students are saying about your food.</p>
      </div>

      {query.isLoading ? (
        <LoadingState label="Loading reviews…" />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : reviews.length === 0 ? (
        <EmptyState title="No reviews yet" description="Reviews from completed orders will appear here." icon={MessageSquare} />
      ) : (
        <>
          <div className="flex items-center gap-4 border-b border-[var(--color-border)] pb-6">
            <div className="text-5xl font-bold tracking-tight text-[var(--color-foreground)]">{avg.toFixed(1)}</div>
            <div>
              <Stars rating={avg} />
              <p className="text-sm font-medium text-[var(--color-muted-foreground)] mt-1">
                Based on {reviews.length} review{reviews.length === 1 ? '' : 's'}
              </p>
            </div>
          </div>

          <div className="grid gap-4">
            {reviews.map((review) => {
              const rating = review.vendorRating ?? review.foodRating ?? 0;
              return (
                <TonalCard key={review.id} className="flex flex-col space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-semibold text-[var(--color-foreground)]">
                        {review.menuItemName || review.orderNumber || 'Order review'}
                      </p>
                      <p className="text-xs text-[var(--color-muted-foreground)]">{formatRelative(review.createdAt)}</p>
                    </div>
                    <Stars rating={rating} />
                  </div>
                  {review.comment && (
                    <p className="text-sm text-[var(--color-foreground)] leading-relaxed">“{review.comment}”</p>
                  )}
                </TonalCard>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
