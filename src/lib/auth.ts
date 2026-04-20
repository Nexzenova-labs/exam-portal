import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

const SECRET = process.env.JWT_SECRET || "fallback-secret-change-in-production";

export function signAdminToken(adminId: string): string {
  return jwt.sign({ adminId, role: "admin" }, SECRET, { expiresIn: "8h" });
}

export function verifyAdminToken(token: string): { adminId: string } | null {
  try {
    return jwt.verify(token, SECRET) as { adminId: string };
  } catch {
    return null;
  }
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateExamToken(registrationId: string): string {
  return jwt.sign({ registrationId, type: "exam" }, SECRET, { expiresIn: "24h" });
}

export function verifyExamToken(token: string): { registrationId: string } | null {
  try {
    const payload = jwt.verify(token, SECRET) as { registrationId: string; type: string };
    if (payload.type !== "exam") return null;
    return { registrationId: payload.registrationId };
  } catch {
    return null;
  }
}
