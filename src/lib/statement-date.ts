export type AggregationBasis =
  | "billing_month"
  | "payment_month_candidate"
  | "original_date_fallback";

export interface DateNormalizationInput {
  originalDate: string;
  billingMonth?: string | null;
  paymentMonthCandidate?: string | null;
}

export interface DateNormalizationResult {
  originalDate: string;
  billingMonth: string | null;
  paymentMonthCandidate: string | null;
  aggregationDate: string;
  aggregationMonth: string;
  aggregationBasis: AggregationBasis;
}

export function parseStatementMonthFromFileName(fileName?: string | null): string | null {
  if (!fileName) return null;

  const normalized = fileName.normalize("NFC");
  const korean = normalized.match(/(20\d{2})년\s*(\d{1,2})월/);
  if (korean) {
    const [, year, month] = korean;
    return `${year}-${String(month).padStart(2, "0")}`;
  }

  const iso = normalized.match(/(20\d{2})[-_.](\d{2})/);
  if (iso) {
    const [, year, month] = iso;
    return `${year}-${month}`;
  }

  return null;
}

export function normalizeTransactionDates(
  input: DateNormalizationInput
): DateNormalizationResult {
  const billingMonth = normalizeMonth(input.billingMonth);
  const paymentMonthCandidate = normalizeMonth(input.paymentMonthCandidate);

  if (billingMonth) {
    return {
      originalDate: input.originalDate,
      billingMonth,
      paymentMonthCandidate,
      aggregationDate: `${billingMonth}-01`,
      aggregationMonth: billingMonth,
      aggregationBasis: "billing_month",
    };
  }

  if (paymentMonthCandidate) {
    return {
      originalDate: input.originalDate,
      billingMonth: null,
      paymentMonthCandidate,
      aggregationDate: `${paymentMonthCandidate}-01`,
      aggregationMonth: paymentMonthCandidate,
      aggregationBasis: "payment_month_candidate",
    };
  }

  return {
    originalDate: input.originalDate,
    billingMonth: null,
    paymentMonthCandidate: null,
    aggregationDate: input.originalDate,
    aggregationMonth: input.originalDate.slice(0, 7),
    aggregationBasis: "original_date_fallback",
  };
}

function normalizeMonth(value?: string | null): string | null {
  if (!value) return null;
  const trimmed = String(value).trim();
  const match = trimmed.match(/^(20\d{2})-(\d{2})$/);
  if (!match) return null;
  return `${match[1]}-${match[2]}`;
}
