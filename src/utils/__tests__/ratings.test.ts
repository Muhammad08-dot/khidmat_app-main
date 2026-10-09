// @ts-nocheck
import { averageRating, ratingDistribution } from "../ratings";

describe("averageRating", () => {
  it("returns 0 for an empty list", () => {
    expect(averageRating([])).toBe(0);
  });

  it("ignores null / undefined / NaN entries", () => {
    expect(averageRating([5, null, undefined, NaN, 3])).toBe(4);
  });

  it("rounds to one decimal place", () => {
    // (4 + 4 + 5) / 3 = 4.333... -> 4.3
    expect(averageRating([4, 4, 5])).toBe(4.3);
  });

  it("averages a single value as-is", () => {
    expect(averageRating([5])).toBe(5);
  });
});

describe("ratingDistribution", () => {
  it("buckets ratings into 1..5", () => {
    expect(ratingDistribution([5, 5, 4, 3, 1])).toEqual({ 1: 1, 2: 0, 3: 1, 4: 1, 5: 2 });
  });

  it("ignores out-of-range and non-number values", () => {
    expect(ratingDistribution([0, 6, null, undefined, 5])).toEqual({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 1 });
  });
});
