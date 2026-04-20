import * as XLSX from "xlsx";

export interface ParsedQuestion {
  question: string;
  options: string[];
  answer: string; // The correct option text (e.g., "B) AI that creates new content...")
  answerIndex: number; // 0-based index
}

export interface ParsedExam {
  title: string;
  questions: ParsedQuestion[];
}

/**
 * Parse Excel file buffer.
 * Expected columns: Question, Option A, Option B, Option C, Option D, Answer (A/B/C/D or full text)
 */
export function parseExcel(buffer: Buffer, filename: string): ParsedExam {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: "" });

  const questions: ParsedQuestion[] = [];

  for (const row of rows) {
    const keys = Object.keys(row);
    if (keys.length < 5) continue;

    // Try to find columns by name (flexible matching)
    const findCol = (patterns: string[]) => {
      const key = keys.find((k) =>
        patterns.some((p) => k.toLowerCase().includes(p.toLowerCase()))
      );
      return key ? String(row[key]).trim() : "";
    };

    const question = findCol(["question", "q."]);
    const optA = findCol(["option a", "opt a", "a)", "choice a"]) || String(row[keys[1]] || "").trim();
    const optB = findCol(["option b", "opt b", "b)", "choice b"]) || String(row[keys[2]] || "").trim();
    const optC = findCol(["option c", "opt c", "c)", "choice c"]) || String(row[keys[3]] || "").trim();
    const optD = findCol(["option d", "opt d", "d)", "choice d"]) || String(row[keys[4]] || "").trim();
    const answerRaw = findCol(["answer", "correct", "ans"]) || String(row[keys[5]] || "").trim();

    if (!question) continue;

    const options = [optA, optB, optC, optD].filter(Boolean);
    if (options.length < 2) continue;

    // Determine answer index: could be "A","B","C","D" or "0","1","2","3" or full text
    let answerIndex = 0;
    const upper = answerRaw.toUpperCase().trim();
    if (upper === "A" || upper === "1") answerIndex = 0;
    else if (upper === "B" || upper === "2") answerIndex = 1;
    else if (upper === "C" || upper === "3") answerIndex = 2;
    else if (upper === "D" || upper === "4") answerIndex = 3;
    else {
      // Try to match by content
      const idx = options.findIndex((o) =>
        o.toLowerCase().includes(answerRaw.toLowerCase()) ||
        answerRaw.toLowerCase().includes(o.toLowerCase())
      );
      answerIndex = idx >= 0 ? idx : 0;
    }

    questions.push({
      question,
      options,
      answer: options[answerIndex],
      answerIndex,
    });
  }

  const title = filename.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
  return { title, questions };
}

/**
 * Parse a simple text/markdown format:
 * 1. Question text?
 * A) Option A
 * B) Option B  ✅  <-- correct
 * C) Option C
 * D) Option D
 */
export function parseTextFormat(text: string, title: string): ParsedExam {
  const questions: ParsedQuestion[] = [];
  const blocks = text.split(/\n\s*\n/).filter(Boolean);

  for (const block of blocks) {
    const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length < 3) continue;

    // First line is the question (strip leading number like "1.")
    const questionLine = lines[0].replace(/^\d+[\.\)]\s*/, "").replace(/\*\*/g, "").trim();
    if (!questionLine) continue;

    const optionLines = lines.slice(1);
    const options: string[] = [];
    let answerIndex = 0;

    optionLines.forEach((line, idx) => {
      const isCorrect = line.includes("✅") || line.includes("✓");
      const cleaned = line
        .replace(/^[A-Da-d][\.\)]\s*/, "")
        .replace(/✅|✓/g, "")
        .trim();
      if (cleaned) {
        options.push(cleaned);
        if (isCorrect) answerIndex = options.length - 1;
      }
    });

    if (options.length >= 2) {
      questions.push({
        question: questionLine,
        options,
        answer: options[answerIndex],
        answerIndex,
      });
    }
  }

  return { title, questions };
}
