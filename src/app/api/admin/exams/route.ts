import { prisma } from "@/lib/db";
import { verifyAdminToken } from "@/lib/auth";
import { cookies } from "next/headers";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_token")?.value;
  if (!token || !verifyAdminToken(token)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const exams = await prisma.exam.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { registrations: true } },
    },
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const result = await Promise.all(
    exams.map(async (exam) => {
      const questions = JSON.parse(exam.questions) as unknown[];
      const registerLink = `${appUrl}/register/${exam.id}`;
      const QRCode = (await import("qrcode")).default;
      const qrCode = await QRCode.toDataURL(registerLink, { width: 180 });

      return {
        id: exam.id,
        title: exam.title,
        description: exam.description,
        totalMarks: exam.totalMarks,
        totalQuestions: questions.length,
        isActive: exam.isActive,
        registrationCount: exam._count.registrations,
        registerLink,
        qrCode,
        createdAt: exam.createdAt,
      };
    })
  );

  return Response.json({ exams: result });
}

export async function PATCH(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_token")?.value;
  if (!token || !verifyAdminToken(token)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { examId, isActive } = await request.json();
  await prisma.exam.update({ where: { id: examId }, data: { isActive } });
  return Response.json({ success: true });
}
