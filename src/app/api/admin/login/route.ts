import { prisma } from "@/lib/db";
import { comparePassword, hashPassword, signAdminToken } from "@/lib/auth";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return Response.json({ error: "Email and password are required" }, { status: 400 });
    }

    // Auto-create admin on first login if using env credentials
    let admin = await prisma.admin.findUnique({ where: { email } });

    if (!admin) {
      if (
        email === process.env.ADMIN_EMAIL &&
        password === process.env.ADMIN_PASSWORD
      ) {
        admin = await prisma.admin.create({
          data: {
            email,
            password: await hashPassword(password),
          },
        });
      } else {
        return Response.json({ error: "Invalid credentials" }, { status: 401 });
      }
    } else {
      const valid = await comparePassword(password, admin.password);
      if (!valid) {
        return Response.json({ error: "Invalid credentials" }, { status: 401 });
      }
    }

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
    console.error("Login error:", err);
    return Response.json({ error: "Server error. Please try again." }, { status: 500 });
  }
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete("admin_token");
  return Response.json({ success: true });
}
