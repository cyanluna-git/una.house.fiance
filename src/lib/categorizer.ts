import { db } from "./db";
import { categoryRules } from "./db/schema";
import { desc } from "drizzle-orm";
import { NECESSITY_DEFAULTS } from "./categories";
import type { CategoryRule } from "./db/schema";

export interface CategoryResult {
  categoryL1: string;
  categoryL2: string;
  categoryL3: string;
  necessity: "essential" | "discretionary" | "unset";
}

// Cache rules in memory, reload when invalidated
let cachedRules: CategoryRule[] | null = null;

function getRules(): CategoryRule[] {
  if (!cachedRules) {
    cachedRules = db
      .select()
      .from(categoryRules)
      .orderBy(desc(categoryRules.priority))
      .all();
  }
  return cachedRules;
}

/** Call after rule CRUD to refresh the cache */
export function invalidateRulesCache() {
  cachedRules = null;
}

export function categorizeMerchant(merchant: string): CategoryResult {
  const rules = getRules();
  const lowerMerchant = merchant.toLowerCase();

  for (const rule of rules) {
    if (lowerMerchant.includes(rule.keyword.toLowerCase())) {
      const necessity = NECESSITY_DEFAULTS[rule.categoryL1] || "unset";
      return {
        categoryL1: rule.categoryL1,
        categoryL2: rule.categoryL2 || "",
        categoryL3: rule.categoryL3 || "",
        necessity,
      };
    }
  }

  return { categoryL1: "기타", categoryL2: "미분류", categoryL3: "", necessity: "unset" };
}
