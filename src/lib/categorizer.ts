import { initialCategoryRules } from "./db/seed-rules";

const rules = initialCategoryRules;

export function categorizeMerchant(merchant: string): string {
  const lowerMerchant = merchant.toLowerCase();

  // Sort by priority (descending) to check higher priority rules first
  const sortedRules = [...rules].sort((a, b) => (b.priority || 0) - (a.priority || 0));

  for (const rule of sortedRules) {
    if (lowerMerchant.includes(rule.keyword.toLowerCase())) {
      return rule.category;
    }
  }

  return "미분류";
}
