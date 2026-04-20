import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: process.env.SMTP_SECURE === "true", // true for port 465, false for 587
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendOTPEmail(email: string, otp: string, name: string) {
  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: email,
    subject: "Your OTP for Exam Registration",
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:32px;border:1px solid #e5e7eb;border-radius:8px;">
        <h2 style="color:#1d4ed8;">Exam Portal - Email Verification</h2>
        <p>Hi <strong>${name}</strong>,</p>
        <p>Your One-Time Password (OTP) for email verification is:</p>
        <div style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#1d4ed8;padding:16px;background:#eff6ff;border-radius:8px;text-align:center;">
          ${otp}
        </div>
        <p style="color:#6b7280;margin-top:16px;">This OTP is valid for <strong>10 minutes</strong>. Do not share it with anyone.</p>
      </div>
    `,
  });
}

export async function sendExamLink(
  email: string,
  name: string,
  examTitle: string,
  examLink: string
) {
  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: email,
    subject: `Your Exam Link - ${examTitle}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:32px;border:1px solid #e5e7eb;border-radius:8px;">
        <h2 style="color:#1d4ed8;">Your Exam is Ready!</h2>
        <p>Hi <strong>${name}</strong>,</p>
        <p>You have been registered for: <strong>${examTitle}</strong></p>
        <p>Click the button below to start your exam:</p>
        <a href="${examLink}" style="display:inline-block;margin:16px 0;padding:14px 28px;background:#1d4ed8;color:#fff;text-decoration:none;border-radius:6px;font-weight:bold;">
          Start Exam
        </a>
        <p style="color:#dc2626;font-weight:bold;">⚠️ Important Instructions:</p>
        <ul style="color:#374151;">
          <li>Do NOT close or switch tabs during the exam</li>
          <li>Closing the tab will automatically end your exam</li>
          <li>You have limited attempts — use them wisely</li>
          <li>Your results will be sent to this email after submission</li>
        </ul>
        <p style="color:#6b7280;font-size:12px;">If you did not register for this exam, ignore this email.</p>
      </div>
    `,
  });
}

export async function sendExamResult(
  email: string,
  name: string,
  examTitle: string,
  score: number,
  totalMarks: number,
  percentage: number,
  answers: { question: string; yourAnswer: string; correctAnswer: string; correct: boolean }[]
) {
  const passed = percentage >= 40;
  const rows = answers
    .map(
      (a, i) => `
      <tr style="background:${a.correct ? "#f0fdf4" : "#fff1f2"}">
        <td style="padding:8px;border:1px solid #e5e7eb;">${i + 1}</td>
        <td style="padding:8px;border:1px solid #e5e7eb;">${a.question}</td>
        <td style="padding:8px;border:1px solid #e5e7eb;color:${a.correct ? "#16a34a" : "#dc2626"};">${a.yourAnswer || "Not answered"}</td>
        <td style="padding:8px;border:1px solid #e5e7eb;color:#16a34a;">${a.correctAnswer}</td>
        <td style="padding:8px;border:1px solid #e5e7eb;text-align:center;">${a.correct ? "✅" : "❌"}</td>
      </tr>
    `
    )
    .join("");

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: email,
    subject: `Your Exam Result - ${examTitle}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:700px;margin:auto;padding:32px;border:1px solid #e5e7eb;border-radius:8px;">
        <h2 style="color:#1d4ed8;">Exam Result - ${examTitle}</h2>
        <p>Hi <strong>${name}</strong>, here are your results:</p>
        <div style="display:flex;gap:16px;margin:16px 0;">
          <div style="flex:1;padding:16px;background:#eff6ff;border-radius:8px;text-align:center;">
            <div style="font-size:32px;font-weight:bold;color:#1d4ed8;">${score}/${totalMarks}</div>
            <div style="color:#6b7280;">Score</div>
          </div>
          <div style="flex:1;padding:16px;background:${passed ? "#f0fdf4" : "#fff1f2"};border-radius:8px;text-align:center;">
            <div style="font-size:32px;font-weight:bold;color:${passed ? "#16a34a" : "#dc2626"};">${percentage.toFixed(1)}%</div>
            <div style="color:#6b7280;">${passed ? "Passed" : "Failed"}</div>
          </div>
        </div>
        <h3>Answer Sheet</h3>
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <thead>
            <tr style="background:#1d4ed8;color:#fff;">
              <th style="padding:8px;border:1px solid #e5e7eb;">#</th>
              <th style="padding:8px;border:1px solid #e5e7eb;">Question</th>
              <th style="padding:8px;border:1px solid #e5e7eb;">Your Answer</th>
              <th style="padding:8px;border:1px solid #e5e7eb;">Correct Answer</th>
              <th style="padding:8px;border:1px solid #e5e7eb;">Result</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `,
  });
}
