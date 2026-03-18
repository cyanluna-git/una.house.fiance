// Shared TypeScript types for unahouse.finance
// Consolidated from local interface definitions across page components

/** Full transaction record returned from API */
export interface Transaction {
  id: number;
  date: string;
  originalDate: string | null;
  billingMonth: string | null;
  paymentMonthCandidate: string | null;
  aggregationDate: string | null;
  aggregationMonth: string | null;
  aggregationBasis: string | null;
  cardCompany: string;
  cardName: string | null;
  cardId: number | null;
  merchant: string;
  amount: number;
  categoryL1: string;
  categoryL2: string;
  categoryL3: string;
  necessity: string | null;
  familyMemberId: number | null;
  tripId: number | null;
  isCompanyExpense: boolean;
  note: string | null;
}

/** Full card entity with usage stats */
export interface Card {
  id: number;
  cardCompany: string;
  cardName: string;
  cardNumber: string | null;
  cardType: string | null;
  isActive: boolean;
  annualFee: number;
  issueDate: string | null;
  expiryDate: string | null;
  monthlyTarget: number | null;
  monthlyDiscountLimit: number | null;
  mainBenefits: string | null;
  familyMemberId: number | null;
  note: string | null;
  monthlyUsage: number;
}

/** Lightweight card reference for filter dropdowns */
export interface CardInfo {
  id: number;
  cardCompany: string;
  cardName: string;
  isActive: boolean;
}

/** Full trip entity with computed expense data */
export interface Trip {
  id: number;
  name: string;
  destination: string | null;
  startDate: string | null;
  endDate: string | null;
  budget: number | null;
  note: string | null;
  totalExpense: number;
  transactionCount: number;
  categoryBreakdown: CategoryBreakdown[];
  transactions: TripTransaction[];
}

/** Lightweight trip reference for dropdowns (e.g., transaction edit) */
export interface TripRef {
  id: number;
  name: string;
}

/** Transaction record scoped to a trip */
export interface TripTransaction {
  id: number;
  date: string;
  originalDate: string | null;
  merchant: string;
  amount: number;
  categoryL2: string | null;
  cardCompany: string;
}

/** Lightweight family member reference */
export interface FamilyMember {
  id: number;
  name: string;
  relation: string;
}

/** Full family member record (family management page) */
export interface FamilyMemberDetail {
  id: number;
  name: string;
  relation: string;
  birthYear: number | null;
  note: string | null;
}

/** Category breakdown used in trip and analytics pages */
export interface CategoryBreakdown {
  category: string | null;
  total: number;
  count: number;
}

/** Category auto-classification rule */
export interface CategoryRule {
  id: number;
  keyword: string;
  categoryL1: string;
  categoryL2: string;
  categoryL3: string;
  priority: number;
}

/** Fixed recurring expense */
export interface FixedExpense {
  id: number;
  name: string;
  category: string;
  amount: number;
  frequency: string | null;
  weekdays: string | null;
  annualDate: string | null;
  paymentDay: number | null;
  paymentMethod: string | null;
  recipient: string | null;
  familyMemberId: number | null;
  startDate: string;
  endDate: string | null;
  isActive: boolean;
  note: string | null;
}

/** API response from file import endpoint */
export interface ImportResult {
  fileName: string;
  savedCount: number;
  duplicateCount: number;
}

/** Seed rule shape used in db initialization */
export interface SeedRule {
  keyword: string;
  categoryL1: string;
  categoryL2?: string;
  categoryL3?: string;
  priority?: number;
}

/** API response shape for GET /api/dashboard */
export interface DashboardResponse {
  availableMonths: string[];

  // Snapshot metrics
  incomeTotal: number;
  grossIncome: number;
  totalDeductions: number;
  totalSpend: number;
  pureHouseholdSpend: number;
  companyExpenseTotal: number;
  totalCount: number;
  fixedExpenseMonthly: number;
  savingsRate: number | null;

  // Month-over-month change
  momChange: { amount: number; percent: number | null } | null;

  // Chart data
  categoryBreakdown: { category: string; amount: number; count: number }[];
  necessityBreakdown: { label: string; amount: number }[];
  familyBreakdown: { name: string; amount: number }[];
  incomeExpenseData: { month: string; income: number; expense: number }[];
  trendData: { month: string; amount: number }[];

  // Drill-down table
  categoryTable: {
    categoryL1: string;
    amount: number;
    count: number;
    children: { categoryL2: string; amount: number; count: number }[];
  }[];
}

/** API response shape for GET /api/categories/analytics */
export interface CategoryAnalyticsResponse {
  availableMonths: string[];
  categoryTrend: Array<Record<string, string | number> & { month: string }>;
  l2Breakdown: Array<{
    categoryL1: string;
    categoryL2: string;
    amount: number;
    count: number;
    months: { month: string; amount: number }[];
  }>;
  necessityTrend: Array<{
    month: string;
    essential: number;
    discretionary: number;
    waste: number;
    unset: number;
  }>;
  familyCategoryMatrix: Array<Record<string, string | number> & { memberName: string }>;
  summary: {
    totalAmount: number;
    topL1: string;
    topL2: string;
    avgMonthly: number;
  };
}
