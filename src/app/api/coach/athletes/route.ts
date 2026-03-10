import bcrypt from "bcryptjs";
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

  const passwordHash = await bcrypt.hash(String(body.password), 10);
  const athlete = await prisma.user.create({
    data: {
      email: String(body.email),
      firstName: String(body.firstName),
      lastName: String(body.lastName),
      passwordHash,
      role: "ATHLETE",
      athleteProfile: { create: { coachId: coach.id } }
    }
  });

  return NextResponse.json({ athleteId: athlete.id }, { status: 201 });
}
