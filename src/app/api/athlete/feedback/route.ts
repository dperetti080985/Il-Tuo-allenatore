import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "ATHLETE") {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  const body = Object.fromEntries(await req.formData());
  const athlete = await prisma.athleteProfile.findUnique({ where: { userId: session.userId } });
  if (!athlete) return NextResponse.json({ error: "Atleta non trovato" }, { status: 404 });

  const feedback = await prisma.workoutFeedback.create({
    data: {
      assignmentId: String(body.assignmentId),
      athleteId: athlete.id,
      rating: Number(body.rating),
      notes: String(body.notes || ""),
      perceivedLoad: body.perceivedLoad ? Number(body.perceivedLoad) : null
    }
  });

  return NextResponse.json({ feedback }, { status: 201 });
}
