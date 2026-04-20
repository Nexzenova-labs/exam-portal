import { prisma } from "@/lib/db";
import { generateExamToken } from "@/lib/auth";
import { sendExamLink } from "@/lib/email";
import { sendExamLinkSMS } from "@/lib/sms";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const examId = searchParams.get("examId");
  if (!examId) return Response.json({ error: "Missing examId" }, { status: 400 });

  const exam = await prisma.exam.findUnique({ where: { id: examId } });
  if (!exam || !exam.isActive) {
    return Response.json({ error: "Exam not found or inactive" }, { status: 404 });
  }

  return Response.json({
    exam: {
      id: exam.id,
      title: exam.title,
      description: exam.description,
      totalMarks: exam.totalMarks,
    },
  });
}

export async function POST(request: Request) {
  const { examId, name, branch, section, email, phone } = await request.json();

  if (!examId || !name || !branch || !section || !email || !phone) {
    return Response.json({ error: "All fields are required" }, { status: 400 });
  }

  const exam = await prisma.exam.findUnique({ where: { id: examId } });
  if (!exam || !exam.isActive) {
    return Response.json({ error: "Exam not found or not active" }, { status: 404 });
  }

  // Check if already registered
  const existing = await prisma.registration.findUnique({
    where: { examId_email: { examId, email } },
  });
  if (existing) {
    return Response.json({ error: "This email is already registered for this exam." }, { status: 409 });
  }

  // Create registration
  const reg = await prisma.registration.create({
    data: {
      examId,
      name: name.trim(),
      branch,
      section: section.trim(),
      email: email.toLowerCase().trim(),
      phone: phone.trim(),
      emailVerified: true,
      phoneVerified: true,
    },
  });

  // Generate unique exam token and link
  const token = generateExamToken(reg.id);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const examLink = `${appUrl}/exam/${token}`;

  await prisma.registration.update({
    where: { id: reg.id },
    data: { examLink, linkSent: true },
  });

  // Create pending session
  await prisma.examSession.create({
    data: { registrationId: reg.id, token, status: "pending" },
  });

  // Fire-and-forget — don't block response waiting for SMTP
  Promise.all([
    sendExamLink(email, name, exam.title, examLink).catch((e) =>
      console.error("Email error:", e)
    ),
    sendExamLinkSMS(phone, name, examLink).catch((e) =>
      console.error("SMS error:", e)
    ),
  ]);

  return Response.json({
    success: true,
    message: "Registration successful! Exam link sent to your email and mobile.",
  });
}
