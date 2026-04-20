import { prisma } from "@/lib/db";
import { verifyExamToken } from "@/lib/auth";

export async function POST(request: Request) {
  const { token, sessionId } = await request.json();

  const payload = verifyExamToken(token);
  if (!payload) return Response.json({ error: "Invalid token" }, { status: 400 });

  const session = await prisma.examSession.findUnique({ where: { id: sessionId } });
  if (!session || session.registrationId !== payload.registrationId) {
    return Response.json({ error: "Invalid session" }, { status: 403 });
  }

  if (session.status === "active") {
    await prisma.examSession.update({
      where: { id: sessionId },
      data: { status: "closed", endedAt: new Date() },
    });
  }

  return Response.json({ success: true });
}
