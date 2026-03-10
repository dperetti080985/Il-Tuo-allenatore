import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const coachPasswordHash = await bcrypt.hash("coach123", 10);
  const athletePasswordHash = await bcrypt.hash("athlete123", 10);

  const coach = await prisma.user.upsert({
    where: { email: "coach@demo.it" },
    update: {},
    create: {
      email: "coach@demo.it",
      passwordHash: coachPasswordHash,
      firstName: "Mario",
      lastName: "Rossi",
      role: "COACH",
      coachProfile: { create: {} }
    },
    include: { coachProfile: true }
  });

  if (!coach.coachProfile) return;

  const athleteUsers = await Promise.all([
    prisma.user.upsert({
      where: { email: "anna@demo.it" },
      update: {},
      create: {
        email: "anna@demo.it",
        passwordHash: athletePasswordHash,
        firstName: "Anna",
        lastName: "Verdi",
        role: "ATHLETE",
        athleteProfile: { create: { coachId: coach.coachProfile.id } }
      },
      include: { athleteProfile: true }
    }),
    prisma.user.upsert({
      where: { email: "luca@demo.it" },
      update: {},
      create: {
        email: "luca@demo.it",
        passwordHash: athletePasswordHash,
        firstName: "Luca",
        lastName: "Bianchi",
        role: "ATHLETE",
        athleteProfile: { create: { coachId: coach.coachProfile.id } }
      },
      include: { athleteProfile: true }
    })
  ]);

  const workout = await prisma.workout.create({
    data: {
      coachId: coach.coachProfile.id,
      title: "Forza gambe",
      description: "Seduta con focus su squat e affondi",
      status: "PUBLISHED",
      blocks: {
        create: [
          { order: 1, title: "Riscaldamento", instructions: "10 min corsa leggera", durationMin: 10 },
          { order: 2, title: "Squat", instructions: "4x6 @80%", durationMin: 20 },
          { order: 3, title: "Affondi", instructions: "3x10 per gamba", durationMin: 15 }
        ]
      }
    }
  });

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  for (const athlete of athleteUsers) {
    if (!athlete.athleteProfile) continue;
    await prisma.workoutAssignment.create({
      data: {
        workoutId: workout.id,
        athleteId: athlete.athleteProfile.id,
        scheduledAt: tomorrow
      }
    });
  }
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
