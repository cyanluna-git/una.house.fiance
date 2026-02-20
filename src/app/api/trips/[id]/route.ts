import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { trips } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const tripId = Number(id);

    const existing = db.select().from(trips).where(eq(trips.id, tripId)).get();
    if (!existing) {
      return NextResponse.json({ error: "여행을 찾을 수 없습니다" }, { status: 404 });
    }

    db.update(trips)
      .set({
        name: body.name ?? existing.name,
        destination: body.destination !== undefined ? body.destination : existing.destination,
        startDate: body.startDate !== undefined ? body.startDate : existing.startDate,
        endDate: body.endDate !== undefined ? body.endDate : existing.endDate,
        budget: body.budget !== undefined ? (body.budget ? Number(body.budget) : null) : existing.budget,
        note: body.note !== undefined ? body.note : existing.note,
      })
      .where(eq(trips.id, tripId))
      .run();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PUT /api/trips/[id] error:", error);
    return NextResponse.json({ error: "수정 실패" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tripId = Number(id);

    const existing = db.select().from(trips).where(eq(trips.id, tripId)).get();
    if (!existing) {
      return NextResponse.json({ error: "여행을 찾을 수 없습니다" }, { status: 404 });
    }

    db.delete(trips).where(eq(trips.id, tripId)).run();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/trips/[id] error:", error);
    return NextResponse.json({ error: "삭제 실패" }, { status: 500 });
  }
}
