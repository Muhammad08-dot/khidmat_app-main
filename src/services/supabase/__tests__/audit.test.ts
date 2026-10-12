// @ts-nocheck
// Runtime self-check: the audit trail is populated on every admin mutation.
// Forces DEMO_MODE before the client module is imported so `supabase` points
// at the in-memory mock.
process.env.EXPO_PUBLIC_DEMO_MODE = "true";

const { supabase } = require("../client");
const {
  getPendingProviders,
  setProviderVerification,
  setReviewHidden,
} = require("../queries");

describe("admin_actions audit trail (mock)", () => {
  it("signs in as admin, verifies a provider, and appends one audit row", async () => {
    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email: "admin@khidmat.app",
      password: "123456",
    });
    expect(signInErr).toBeNull();

    const queue = await getPendingProviders();
    const nadia = queue.find((p) => p.name === "Nadia Karim");
    expect(nadia).toBeTruthy();

    await setProviderVerification(nadia.id, "verified");

    const { data: log } = await supabase
      .from("admin_actions")
      .select("*")
      .eq("target_id", nadia.id);
    expect(log.length).toBeGreaterThanOrEqual(1);
    const entry = log.find((e) => e.action === "provider.verified");
    expect(entry).toBeTruthy();
    expect(entry.actor_id).toBeTruthy();
    expect(entry.target_type).toBe("profile");
  });

  it("hiding a review appends a review.hidden audit row with provider_id meta", async () => {
    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email: "admin@khidmat.app",
      password: "123456",
    });
    expect(signInErr).toBeNull();

    const reviewId = "r0020000-0000-4000-8000-000000000000";
    const providerId = "b1a10000-0000-4000-8000-000000000000";

    await setReviewHidden(reviewId, providerId, true);

    const { data: log } = await supabase
      .from("admin_actions")
      .select("*")
      .eq("target_id", reviewId);
    const hidden = log.find((e) => e.action === "review.hidden");
    expect(hidden).toBeTruthy();
    expect(hidden.target_type).toBe("review");
    expect(hidden.meta.provider_id).toBe(providerId);
  });
});
