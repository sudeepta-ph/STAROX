import UserModel from "../models/User.js";
import type { CdxType, PlanTier } from "../types.js";

const PLAN_CREDITS: Record<PlanTier, number> = {
  free: 5,
  starter: 100,
  pro: 1000000
};

const COST: Record<CdxType, number> = {
  cdx1: 2,
  cdx2: 1,
  cdx3: 2,
};

export async function ensureCredits(userId: string, tier: PlanTier, type: CdxType) {
  const required = COST[type];
  
  // Find user by clerkId
  let user = await UserModel.findOne({ clerkId: userId });

  if (!user) {
    // If not found in Mongo yet, create one
    user = await UserModel.create({
      clerkId: userId,
      role: "user",
      planTier: tier,
      creditsRemaining: PLAN_CREDITS[tier]
    });
    
    if (PLAN_CREDITS[tier] < required) {
      throw new Error("INSUFFICIENT_CREDITS");
    }
    return required;
  }

  if (user.creditsRemaining < required) {
    throw new Error("INSUFFICIENT_CREDITS");
  }

  return required;
}

export async function consumeCredits(userId: string, amount: number) {
  const user = await UserModel.findOne({ clerkId: userId });

  if (!user) throw new Error("CREDIT_RECORD_NOT_FOUND");

  const next = user.creditsRemaining - amount;
  if (next < 0) throw new Error("INSUFFICIENT_CREDITS");

  user.creditsRemaining = next;
  await user.save();
}
