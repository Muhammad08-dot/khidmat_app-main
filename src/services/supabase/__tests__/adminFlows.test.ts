// @ts-nocheck
// End-to-end check of the new admin/moderation data flows against the mock
// Supabase client (forces DEMO_MODE before the client module is imported).
process.env.EXPO_PUBLIC_DEMO_MODE = "true";

const { supabase } = require("../client");
const {
  getPendingProviders,
  setProviderVerification,
  getRecentReviews,
  setReviewHidden,
  getProviderReviews,
} = require("../queries");

const BILAL = "b1a10000-0000-4000-8000-000000000000";

describe("admin verification + review moderation (mock)", () => {
  it("approving a provider removes them from the verification queue", async () => {
    let queue = await getPendingProviders();
    const nadia = queue.find((p) => p.name === "Nadia Karim");
    expect(nadia).toBeTruthy();

    await setProviderVerification(nadia.id, "verified");

    queue = await getPendingProviders();
    expect(queue.some((p) => p.name === "Nadia Karim")).toBe(false);
  });

  it("hiding a review removes it from public display and recomputes the average", async () => {
    // Seed: Bilal has 3 reviews (5, 4, 5) -> visible.
    const before = await getProviderReviews(BILAL);
    expect(before.length).toBe(3);

    const reviews = await getRecentReviews(50);
    const fourStar = reviews.find((r) => r.rating === 4 && r.providerId !== "x");
    expect(fourStar).toBeTruthy();

    // Force the provider id (mock rows carry no embedded provider join).
    await setReviewHidden(fourStar.id, BILAL, true);

    const after = await getProviderReviews(BILAL);
    expect(after.length).toBe(2);
    expect(after.every((r) => r.rating === 5)).toBe(true);

    const { data } = await supabase
      .from("providers")
      .select("rating")
      .eq("id", BILAL)
      .maybeSingle();
    expect(data.rating).toBe(5);
  });
});
