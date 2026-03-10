import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "COACH") {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  const coach = await prisma.coachProfile.findUnique({ where: { userId: session.userId } });
  if (!coach) return NextResponse.json({ error: "Coach non trovato" }, { status: 404 });

  const [athletes, workouts, feedbackCount, avgLoad] = await Promise.all([
    prisma.athleteProfile.count({ where: { coachId: coach.id } }),
    prisma.workout.count({ where: { coachId: coach.id } }),
    prisma.workoutFeedback.count({ where: { athlete: { coachId: coach.id } } }),
    prisma.workoutFeedback.aggregate({ where: { athlete: { coachId: coach.id } }, _avg: { perceivedLoad: true } })
  ]);

  return NextResponse.json({ athletes, workouts, feedbackCount, avgPerceivedLoad: avgLoad._avg.perceivedLoad || 0 });
}
