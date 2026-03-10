import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSessionToken } from "@/lib/auth";

export async function POST(req: Request) {
  const contentType = req.headers.get("content-type") || "";
  const data = contentType.includes("application/json") ? await req.json() : Object.fromEntries(await req.formData());

  const email = String(data.email || "").toLowerCase();
  const password = String(data.password || "");
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return NextResponse.json({ error: "Credenziali non valide" }, { status: 401 });
  }

  const token = await createSessionToken({ userId: user.id, role: user.role, email: user.email });
  const response = NextResponse.json({ message: "ok", role: user.role });
  response.cookies.set("session", token, { httpOnly: true, sameSite: "lax", path: "/" });
  return response;
}
