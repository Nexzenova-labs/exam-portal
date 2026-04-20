import { prisma } from "@/lib/db";
import { verifyAdminToken } from "@/lib/auth";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_token")?.value;
  if (!token || !verifyAdminToken(token)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { registrationId } = await request.json();

  const reg = await prisma.registration.findUnique({
    where: { id: registrationId },
  });

  if (!reg) return Response.json({ error: "Registration not found" }, { status: 404 });

  // Generate a new exam link token
  const { generateExamToken } = await import("@/lib/auth");
  const { sendExamLink } = await import("@/lib/email");
  const { sendExamLinkSMS } = await import("@/lib/sms");

  const newToken = generateExamToken(reg.id);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const examLink = `${appUrl}/exam/${newToken}`;

  // Create new session
  await prisma.examSession.create({
    data: {
      registrationId: reg.id,
      token: newToken,
      status: "pending",
    },
  });

  await prisma.registration.update({
    where: { id: reg.id },
    data: {
      examLink,
      maxAttempts: reg.maxAttempts + 1,
    },
  });

  // Send new link
  const exam = await prisma.exam.findUnique({ where: { id: reg.examId } });
  try {
    await sendExamLink(reg.email, reg.name, exam?.title || "Exam", examLink);
    await sendExamLinkSMS(reg.phone, reg.name, examLink);
  } catch (err) {
    console.error("Failed to send exam link:", err);
  }

  return Response.json({ success: true, message: "Extra attempt granted and link sent." });
}
