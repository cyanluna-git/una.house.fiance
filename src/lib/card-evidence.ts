export function validateCardEvidence(value: { verificationStatus?: unknown; sourceUrl?: unknown; verifiedAt?: unknown }): string | null {
  if (![undefined, "unverified", "verified"].includes(value.verificationStatus as string | undefined)) return "검증 상태가 올바르지 않습니다";
  if (value.sourceUrl) {
    try { if (!["https:", "http:"].includes(new URL(String(value.sourceUrl)).protocol)) return "출처는 http/https URL이어야 합니다"; }
    catch { return "출처 URL이 올바르지 않습니다"; }
  }
  if (value.verifiedAt && !/^\d{4}-\d{2}-\d{2}$/.test(String(value.verifiedAt))) return "확인일 형식이 올바르지 않습니다";
  if (value.verificationStatus === "verified" && (!value.sourceUrl || !value.verifiedAt)) return "확인 완료에는 공식 출처와 확인일이 필요합니다";
  return null;
}
