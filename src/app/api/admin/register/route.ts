import { prisma } from "@/lib/db";
import { hashPassword, signAdminToken } from "@/lib/auth";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  try {
    const { name, email, password } = await request.json();

    if (!name || !email || !password) {
      return Response.json({ error: "All fields are required" }, { status: 400 });
    }

    if (password.length < 8) {
      return Response.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    // Check if email already registered
    const existing = await prisma.admin.findUnique({ where: { email } });
    if (existing) {
      return Response.json({ error: "An admin with this email already exists" }, { status: 409 });
    }

    const admin = await prisma.admin.create({
      data: {
        email,
        password: await hashPassword(password),
      },
    });

    // Auto sign in after registration
    const token = signAdminToken(admin.id);
    const cookieStore = await cookies();
    cookieStore.set("admin_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 8 * 60 * 60,
      path: "/",
    });

    return Response.json({ success: true });
  } catch (err) {
    console.error("Register error:", err);
    return Response.json({ error: "Server error. Please try again." }, { status: 500 });
  }
}
