import { prisma } from "@/lib/db";
import { verifyAdminToken } from "@/lib/auth";
import { cookies } from "next/headers";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_token")?.value;
  if (!token || !verifyAdminToken(token)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const exam = await prisma.exam.findUnique({ where: { id } });
  if (!exam) return Response.json({ error: "Exam not found" }, { status: 404 });

  const registrations = await prisma.registration.findMany({
    where: { examId: id },
    include: {
      submissions: { orderBy: { submittedAt: "desc" }, take: 1 },
      sessions: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { createdAt: "desc" },
  });

  const students = registrations.map((reg) => {
    const latest = reg.submissions[0];
    const session = reg.sessions[0];
    return {
      id: reg.id,
      name: reg.name,
      branch: reg.branch,
      section: reg.section,
      email: reg.email,
      phone: reg.phone,
      emailVerified: reg.emailVerified,
      phoneVerified: reg.phoneVerified,
      linkSent: reg.linkSent,
      attemptsUsed: reg.attemptsUsed,
      maxAttempts: reg.maxAttempts,
      sessionStatus: session?.status ?? "not_started",
      score: latest?.score ?? null,
      totalMarks: latest?.totalMarks ?? exam.totalMarks,
      percentage: latest?.percentage ?? null,
      submittedAt: latest?.submittedAt ?? null,
      registeredAt: reg.createdAt,
    };
  });

  return Response.json({
    exam: {
      id: exam.id,
      title: exam.title,
      totalMarks: exam.totalMarks,
      isActive: exam.isActive,
    },
    students,
  });
}
