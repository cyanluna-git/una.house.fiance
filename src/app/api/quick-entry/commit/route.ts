import { NextRequest, NextResponse } from "next/server";
import { saveQuickEntries, type SaveEntry } from "@/lib/quick-entry/save";

/**
 * POST /api/quick-entry/commit  { entries: SaveEntry[], sourceType?: "sms" | "receipt" }
 * 검토 화면에서 확정한 항목을 저장. 서버에서 중복을 다시 검사한다.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const entries: SaveEntry[] = body.entries;
    const sourceType: "sms" | "receipt" = body.sourceType === "receipt" ? "receipt" : "sms";
    if (!Array.isArray(entries) || !entries.length) {
      return NextResponse.json({ error: "저장할 항목이 없습니다" }, { status: 400 });
    }
    const { savedIds, skipped, results } = saveQuickEntries(entries, sourceType);
    return NextResponse.json({ success: true, savedCount: savedIds.length, savedIds, skipped, results });
  } catch (error) {
    console.error("POST /api/quick-entry/commit error:", error);
    return NextResponse.json({ error: "저장 실패", errorId: crypto.randomUUID() }, { status: 500 });
  }
}
