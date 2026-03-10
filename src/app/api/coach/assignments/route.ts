import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "COACH") {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  const body = await req.json();
  const { workoutId, athleteIds, scheduledAt } = body as { workoutId: string; athleteIds: string[]; scheduledAt: string };

  const created = await Promise.all(
    athleteIds.map((athleteId) =>
      prisma.workoutAssignment.create({
        data: { workoutId, athleteId, scheduledAt: new Date(scheduledAt) }
      })
    )
  );

  return NextResponse.json({ assignments: created }, { status: 201 });
}
