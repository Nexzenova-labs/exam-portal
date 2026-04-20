import { prisma } from "@/lib/db";
import { verifyExamToken } from "@/lib/auth";
import { sendExamResult } from "@/lib/email";
import { shuffleExam, type RawQuestion, type RawAnswer } from "@/lib/shuffle";

export async function POST(request: Request) {
  const { token, sessionId, answers } = await request.json();

  const payload = verifyExamToken(token);
  if (!payload) return Response.json({ error: "Invalid token" }, { status: 400 });

  const reg = await prisma.registration.findUnique({
    where: { id: payload.registrationId },
    include: { exam: true },
  });

  if (!reg) return Response.json({ error: "Registration not found" }, { status: 404 });

  const session = await prisma.examSession.findUnique({ where: { id: sessionId } });
  if (!session || session.registrationId !== reg.id) {
    return Response.json({ error: "Invalid session" }, { status: 403 });
  }
  if (session.status === "submitted") {
    return Response.json({ error: "Already submitted" }, { status: 409 });
  }

  const rawQuestions = JSON.parse(reg.exam.questions) as RawQuestion[];
  const rawAnswers = JSON.parse(reg.exam.answers) as RawAnswer[];

  // Re-derive the same shuffle used when the exam was started (deterministic)
  const { questions: shuffledQuestions, answers: shuffledAnswers } = shuffleExam(
    rawQuestions,
    rawAnswers,
    session.id
  );

  // answers from client: array of option indices (0-based) in the shuffled order
  const studentAnswers: (number | null)[] = Array.isArray(answers) ? answers : [];

  let score = 0;
  const detailedAnswers = shuffledQuestions.map((q, i) => {
    const studentIdx = studentAnswers[i] ?? null;
    const correct = shuffledAnswers[i];
    const isCorrect = studentIdx !== null && studentIdx === correct.answerIndex;
    if (isCorrect) score++;

    return {
      question: q.question,
      yourAnswer: studentIdx !== null ? q.options[studentIdx] : "",
      correctAnswer: correct.answer,
      correct: isCorrect,
    };
  });

  const totalMarks = reg.exam.totalMarks;
  const percentage = (score / totalMarks) * 100;

  // Save submission
  await prisma.submission.create({
    data: {
      registrationId: reg.id,
      examId: reg.examId,
      sessionId,
      answers: JSON.stringify(studentAnswers),
      score,
      totalMarks,
      percentage,
      resultSent: false,
    },
  });

  // Mark session as submitted
  await prisma.examSession.update({
    where: { id: sessionId },
    data: { status: "submitted", endedAt: new Date() },
  });

  // Fire-and-forget result email — don't block the submit response
  sendExamResult(reg.email, reg.name, reg.exam.title, score, totalMarks, percentage, detailedAnswers)
    .then(() => prisma.submission.updateMany({ where: { sessionId }, data: { resultSent: true } }))
    .catch((err) => console.error("Result email error:", err));

  return Response.json({
    success: true,
    score,
    totalMarks,
    percentage: percentage.toFixed(1),
    passed: percentage >= 40,
  });
}
