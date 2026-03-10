import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

export const athleteCreateSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  password: z.string().min(6)
});

export const workoutCreateSchema = z.object({
  title: z.string().min(3),
  description: z.string().optional(),
  blocks: z.array(
    z.object({
      title: z.string().min(2),
      instructions: z.string().min(2),
      durationMin: z.number().int().positive().optional()
    })
  )
});

export const assignmentSchema = z.object({
  workoutId: z.string().cuid(),
  athleteIds: z.array(z.string().cuid()).min(1),
  scheduledAt: z.string().datetime()
});

export const feedbackSchema = z.object({
  assignmentId: z.string().cuid(),
  rating: z.number().int().min(1).max(5),
  notes: z.string().optional(),
  perceivedLoad: z.number().int().min(1).max(10).optional()
});
