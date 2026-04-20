import { createOTP, verifyOTP } from "@/lib/otp";
import { sendOTPEmail } from "@/lib/email";
import { sendOTPSMS } from "@/lib/sms";
import { prisma } from "@/lib/db";

const twilioConfigured = !!(
  process.env.TWILIO_ACCOUNT_SID &&
  process.env.TWILIO_AUTH_TOKEN &&
  process.env.TWILIO_PHONE_NUMBER
);

export async function POST(request: Request) {
  try {
    const { action, type, identifier, code, name } = await request.json();

    if (action === "send") {
      if (!identifier || !type) {
        return Response.json({ error: "Missing fields" }, { status: 400 });
      }

      // If phone OTP requested but Twilio not configured, auto-verify instantly
      if (type === "phone" && !twilioConfigured) {
        return Response.json({
          success: true,
          autoVerified: true,
          message: "Phone verified automatically (SMS not configured)",
        });
      }

      // Rate limit: max 3 OTPs per identifier per 10 minutes
      const recent = await prisma.oTP.count({
        where: {
          identifier,
          type,
          createdAt: { gt: new Date(Date.now() - 10 * 60 * 1000) },
        },
      });
      if (recent >= 3) {
        return Response.json({ error: "Too many OTP requests. Try after 10 minutes." }, { status: 429 });
      }

      const otp = await createOTP(identifier, type as "email" | "phone");

      try {
        if (type === "email") {
          await sendOTPEmail(identifier, otp, name || "Student");
        } else {
          await sendOTPSMS(identifier, otp);
        }
      } catch (err) {
        console.error("OTP send error:", err);
        return Response.json({ error: "Failed to send OTP. Please check your email address and try again." }, { status: 500 });
      }

      return Response.json({ success: true, message: `OTP sent to your ${type}` });
    }

    if (action === "verify") {
      if (!identifier || !type || !code) {
        return Response.json({ error: "Missing fields" }, { status: 400 });
      }

      // Phone auto-verify if no Twilio
      if (type === "phone" && !twilioConfigured) {
        return Response.json({ success: true });
      }

      const valid = await verifyOTP(identifier, type as "email" | "phone", code);
      if (!valid) {
        return Response.json({ error: "Invalid or expired OTP" }, { status: 400 });
      }

      return Response.json({ success: true });
    }

    return Response.json({ error: "Invalid action" }, { status: 400 });
  } catch (err) {
    console.error("OTP route error:", err);
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}
