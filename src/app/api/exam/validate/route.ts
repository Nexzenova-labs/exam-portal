import { prisma } from "@/lib/db";
import { verifyExamToken } from "@/lib/auth";

export async function POST(request: Request) {
  const { token } = await request.json();

  const payload = verifyExamToken(token);
  if (!payload) {
    return Response.json({ error: "Invalid or expired exam link." }, { status: 400 });
  }

  const reg = await prisma.registration.findUnique({
    where: { id: payload.registrationId },
    include: { exam: true },
  });

  if (!reg) return Response.json({ error: "Registration not found." }, { status: 404 });

  if (!reg.exam.isActive) {
    return Response.json({ error: "This exam is no longer active." }, { status: 403 });
  }

  if (reg.attemptsUsed >= reg.maxAttempts) {
    return Response.json({ error: "No attempts remaining. Contact the admin." }, { status: 403 });
  }

  const session = await prisma.examSession.findUnique({ where: { token } });
  if (!session) return Response.json({ error: "Session not found." }, { status: 404 });

  if (session.status === "submitted") {
    return Response.json({ error: "This exam has already been submitted." }, { status: 403 });
  }
  if (session.status === "closed") {
    return Response.json({ error: "Exam was closed (tab closed). Contact admin for a new attempt." }, { status: 403 });
  }

  return Response.json({
    valid: true,
    registration: {
      id: reg.id,
      name: reg.name,
      email: reg.email,
      phone: reg.phone,
    },
    exam: {
      id: reg.exam.id,
      title: reg.exam.title,
      totalMarks: reg.exam.totalMarks,
    },
    sessionId: session.id,
    attemptsUsed: reg.attemptsUsed,
    maxAttempts: reg.maxAttempts,
  });
}
