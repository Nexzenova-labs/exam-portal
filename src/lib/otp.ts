import { prisma } from "./db";

export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function createOTP(
  identifier: string,
  type: "email" | "phone",
  registrationId?: string
): Promise<string> {
  // Invalidate previous OTPs for same identifier+type
  await prisma.oTP.updateMany({
    where: { identifier, type, verified: false },
    data: { verified: true },
  });

  const code = generateOTP();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  await prisma.oTP.create({
    data: {
      identifier,
      type,
      code,
      expiresAt,
      registrationId: registrationId ?? null,
    },
  });

  return code;
}

export async function verifyOTP(
  identifier: string,
  type: "email" | "phone",
  code: string
): Promise<boolean> {
  const otp = await prisma.oTP.findFirst({
    where: {
      identifier,
      type,
      code,
      verified: false,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!otp) return false;

  await prisma.oTP.update({
    where: { id: otp.id },
    data: { verified: true },
  });

  return true;
}
