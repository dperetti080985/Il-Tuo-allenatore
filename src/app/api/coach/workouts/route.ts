import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "COACH") {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  const body = Object.fromEntries(await req.formData());
  const coach = await prisma.coachProfile.findUnique({ where: { userId: session.userId } });
  if (!coach) return NextResponse.json({ error: "Coach non trovato" }, { status: 404 });

  const workout = await prisma.workout.create({
    data: {
      coachId: coach.id,
      title: String(body.title),
      description: String(body.description || ""),
      status: "PUBLISHED",
      blocks: {
        create: [
          { order: 1, title: "Riscaldamento", instructions: "10 min cardio" },
          { order: 2, title: "Main set", instructions: "Serie principali" },
          { order: 3, title: "Defaticamento", instructions: "Stretching" }
        ]
      }
    },
    include: { blocks: true }
  });

  return NextResponse.json(workout, { status: 201 });
}
