export async function sendOTPSMS(phone: string, otp: string): Promise<boolean> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER;

  if (!sid || !token || !from) {
    console.log(`[SMS SKIPPED] OTP for ${phone}: ${otp}`);
    return true;
  }

  try {
    const twilio = (await import("twilio")).default;
    const client = twilio(sid, token);
    await client.messages.create({
      body: `Your Quiz Portal OTP is: ${otp}. Valid for 10 minutes. Do not share.`,
      from,
      to: phone.startsWith("+") ? phone : `+91${phone}`,
    });
    return true;
  } catch (err) {
    console.error("SMS error:", err);
    return false;
  }
}

export async function sendExamLinkSMS(phone: string, name: string, link: string): Promise<boolean> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER;

  if (!sid || !token || !from) {
    console.log(`[SMS SKIPPED] Exam link for ${phone}: ${link}`);
    return true;
  }

  try {
    const twilio = (await import("twilio")).default;
    const client = twilio(sid, token);
    await client.messages.create({
      body: `Hi ${name}, your exam link: ${link}. Do NOT close the tab during the exam.`,
      from,
      to: phone.startsWith("+") ? phone : `+91${phone}`,
    });
    return true;
  } catch (err) {
    console.error("SMS error:", err);
    return false;
  }
}
