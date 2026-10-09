/**
 * Pure rating helpers, free of Supabase / React imports so they can be unit
 * tested in isolation. `legacy.recomputeProviderRating` uses `averageRating`.
 */

/** Mean of a list of ratings, ignoring null/NaN, rounded to one decimal. */
export function averageRating(ratings: Array<number | null | undefined>): number {
  const nums = ratings.filter((r): r is number => typeof r === "number" && !Number.isNaN(r));
  if (nums.length === 0) return 0;
  return Math.round((nums.reduce((sum, r) => sum + r, 0) / nums.length) * 10) / 10;
}

/** Count of reviews per star (1..5) for a rating-distribution display. */
export function ratingDistribution(ratings: Array<number | null | undefined>): Record<number, number> {
  const dist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const r of ratings) {
    if (typeof r === "number" && r >= 1 && r <= 5) dist[Math.round(r)] += 1;
  }
  return dist;
}
