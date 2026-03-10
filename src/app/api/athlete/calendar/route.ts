import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "ATHLETE") {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  const athlete = await prisma.athleteProfile.findUnique({ where: { userId: session.userId } });
  if (!athlete) return NextResponse.json({ error: "Atleta non trovato" }, { status: 404 });

  const assignments = await prisma.workoutAssignment.findMany({
    where: { athleteId: athlete.id },
    include: { workout: { include: { blocks: true } } },
    orderBy: { scheduledAt: "asc" }
  });

  return NextResponse.json({ assignments });
}
