import { prisma } from "@/lib/db";
import { verifyAdminToken } from "@/lib/auth";
import { parseExcel, parseTextFormat } from "@/lib/parser";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_token")?.value;
  if (!token || !verifyAdminToken(token)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const title = (formData.get("title") as string | null)?.trim();

  if (!file) return Response.json({ error: "No file uploaded" }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const filename = file.name;
  const ext = filename.split(".").pop()?.toLowerCase();

  let parsed;
  try {
    if (ext === "xlsx" || ext === "xls" || ext === "csv") {
      parsed = parseExcel(buffer, title || filename);
    } else if (ext === "txt" || ext === "md") {
      parsed = parseTextFormat(buffer.toString("utf-8"), title || filename);
    } else if (ext === "pdf") {
      // Dynamic import to avoid server-side issues
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pdfModule = (await import("pdf-parse")) as any;
      const pdfParse = pdfModule.default ?? pdfModule;
      const data = await pdfParse(buffer);
      parsed = parseTextFormat(data.text, title || filename);
    } else {
      return Response.json({ error: "Unsupported file type. Use xlsx, csv, txt, md, or pdf." }, { status: 400 });
    }
  } catch (err) {
    console.error("Parse error:", err);
    return Response.json({ error: "Failed to parse file. Check format." }, { status: 400 });
  }

  if (!parsed.questions || parsed.questions.length === 0) {
    return Response.json({ error: "No questions found in file." }, { status: 400 });
  }

  const questions = parsed.questions.map((q) => ({
    question: q.question,
    options: q.options,
  }));

  const answers = parsed.questions.map((q) => ({
    answer: q.answer,
    answerIndex: q.answerIndex,
  }));

  const exam = await prisma.exam.create({
    data: {
      title: title || parsed.title,
      questions: JSON.stringify(questions),
      answers: JSON.stringify(answers),
      totalMarks: parsed.questions.length,
    },
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const registerLink = `${appUrl}/register/${exam.id}`;

  // Generate QR code
  const QRCode = (await import("qrcode")).default;
  const qrDataUrl = await QRCode.toDataURL(registerLink, { width: 256 });

  return Response.json({
    success: true,
    exam: {
      id: exam.id,
      title: exam.title,
      totalQuestions: parsed.questions.length,
      registerLink,
      qrCode: qrDataUrl,
    },
  });
}
