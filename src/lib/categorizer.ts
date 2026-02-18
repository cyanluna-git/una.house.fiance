import { initialCategoryRules } from "./db/seed-rules";

export interface CategoryResult {
  categoryL1: string;
  categoryL2: string;
  categoryL3: string;
}

const rules = initialCategoryRules;

export function categorizeMerchant(merchant: string): CategoryResult {
  const lowerMerchant = merchant.toLowerCase();

  // Sort by priority (descending) to check higher priority rules first
  const sortedRules = [...rules].sort((a, b) => (b.priority || 0) - (a.priority || 0));

  for (const rule of sortedRules) {
    if (lowerMerchant.includes(rule.keyword.toLowerCase())) {
      return {
        categoryL1: rule.categoryL1,
        categoryL2: rule.categoryL2 || "",
        categoryL3: rule.categoryL3 || "",
      };
    }
  }

  return { categoryL1: "기타", categoryL2: "미분류", categoryL3: "" };
}
