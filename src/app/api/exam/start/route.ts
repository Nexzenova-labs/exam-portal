import { prisma } from "@/lib/db";
import { verifyExamToken } from "@/lib/auth";
import { shuffleExam, type RawQuestion, type RawAnswer } from "@/lib/shuffle";

export async function POST(request: Request) {
  const { token, email, phone } = await request.json();

  const payload = verifyExamToken(token);
  if (!payload) return Response.json({ error: "Invalid token" }, { status: 400 });

  const reg = await prisma.registration.findUnique({
    where: { id: payload.registrationId },
    include: { exam: true },
  });

  if (!reg) return Response.json({ error: "Registration not found" }, { status: 404 });

  // Verify identity
  if (
    reg.email.toLowerCase() !== email.toLowerCase() ||
    reg.phone.replace(/\D/g, "") !== phone.replace(/\D/g, "")
  ) {
    return Response.json({ error: "Identity verification failed. Email or phone does not match." }, { status: 403 });
  }

  const session = await prisma.examSession.findUnique({ where: { token } });
  if (!session) return Response.json({ error: "Session not found" }, { status: 404 });

  if (session.status === "submitted") {
    return Response.json({ error: "Already submitted" }, { status: 403 });
  }
  if (session.status === "closed") {
    return Response.json({ error: "Exam was closed. Contact admin." }, { status: 403 });
  }

  // Mark session as active
  await prisma.examSession.update({
    where: { id: session.id },
    data: { status: "active", startedAt: new Date() },
  });

  // Increment attempts used
  await prisma.registration.update({
    where: { id: reg.id },
    data: { attemptsUsed: { increment: 1 } },
  });

  const rawQuestions = JSON.parse(reg.exam.questions) as RawQuestion[];
  const rawAnswers = JSON.parse(reg.exam.answers) as RawAnswer[];

  // Shuffle questions and options uniquely per session
  const { questions } = shuffleExam(rawQuestions, rawAnswers, session.id);

  return Response.json({
    success: true,
    sessionId: session.id,
    exam: {
      title: reg.exam.title,
      totalMarks: reg.exam.totalMarks,
      questions, // shuffled, options shuffled — no answers sent to client
    },
  });
}
