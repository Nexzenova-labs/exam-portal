"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";

const BRANCHES = [
  "Computer Science Engineering (CSE)",
  "Computer Science & Engineering (AI & ML)",
  "Computer Science & Engineering (Data Science)",
  "Computer Science & Engineering (Cyber Security)",
  "Information Technology (IT)",
  "Electronics & Communication Engineering (ECE)",
  "Electrical & Electronics Engineering (EEE)",
  "Mechanical Engineering (ME)",
  "Civil Engineering (CE)",
  "Chemical Engineering (CHE)",
  "Biotechnology (BT)",
  "Artificial Intelligence & Machine Learning (AIML)",
  "Data Science (DS)",
  "Other",
];

type Step = "form" | "otp" | "done";

interface ExamInfo {
  id: string;
  title: string;
  description?: string;
  totalMarks: number;
}

export default function RegisterPage() {
  const { examId } = useParams<{ examId: string }>();
  const [exam, setExam] = useState<ExamInfo | null>(null);
  const [examError, setExamError] = useState("");
  const [step, setStep] = useState<Step>("form");

  const [form, setForm] = useState({
    name: "",
    branch: "",
    section: "",
    email: "",
    phone: "",
  });

  const [emailOTP, setEmailOTP] = useState("");
  const [phoneOTP, setPhoneOTP] = useState("");
  const [emailVerified, setEmailVerified] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [sendingPhone, setSendingPhone] = useState(false);
  const [verifyingEmail, setVerifyingEmail] = useState(false);
  const [verifyingPhone, setVerifyingPhone] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [phoneSent, setPhoneSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!examId) return;
    fetch(`/api/register?examId=${examId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setExamError(d.error);
        else setExam(d.exam);
      })
      .catch(() => setExamError("Failed to load exam details."));
  }, [examId]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function sendOTP(type: "email" | "phone") {
    const identifier = type === "email" ? form.email : form.phone;
    if (!identifier) return;

    if (type === "email") setSendingEmail(true);
    else setSendingPhone(true);

    const res = await fetch("/api/otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "send", type, identifier, name: form.name }),
    });
    const data = await res.json();

    if (type === "email") {
      setSendingEmail(false);
      if (!data.error) setEmailSent(true);
      else setError(data.error);
    } else {
      setSendingPhone(false);
      if (data.error) {
        setError(data.error);
      } else if (data.autoVerified) {
        // Twilio not configured — phone auto-verified
        setPhoneVerified(true);
      } else {
        setPhoneSent(true);
      }
    }
  }

  async function verifyOTP(type: "email" | "phone") {
    const identifier = type === "email" ? form.email : form.phone;
    const code = type === "email" ? emailOTP : phoneOTP;

    if (type === "email") setVerifyingEmail(true);
    else setVerifyingPhone(true);

    const res = await fetch("/api/otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "verify", type, identifier, code }),
    });
    const data = await res.json();

    if (type === "email") {
      setVerifyingEmail(false);
      if (data.success) setEmailVerified(true);
      else setError(data.error || "Invalid OTP");
    } else {
      setVerifyingPhone(false);
      if (data.success) setPhoneVerified(true);
      else setError(data.error || "Invalid OTP");
    }
  }

  async function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.name || !form.branch || !form.section || !form.email || !form.phone) {
      setError("All fields are required.");
      return;
    }
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRe.test(form.email)) {
      setError("Please enter a valid email address.");
      return;
    }
    const phoneRe = /^[6-9]\d{9}$/;
    if (!phoneRe.test(form.phone.replace(/\D/g, ""))) {
      setError("Please enter a valid 10-digit Indian mobile number.");
      return;
    }
    setStep("otp");
  }

  async function handleRegister() {
    if (!emailVerified || !phoneVerified) {
      setError("Please verify both email and mobile number.");
      return;
    }
    setSubmitting(true);
    setError("");

    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ examId, ...form }),
    });
    const data = await res.json();
    setSubmitting(false);

    if (data.success) {
      setStep("done");
    } else {
      setError(data.error || "Registration failed. Please try again.");
    }
  }

  if (examError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow p-8 max-w-md w-full text-center">
          <div className="text-4xl mb-3">❌</div>
          <h2 className="text-xl font-bold text-red-600 mb-2">Exam Unavailable</h2>
          <p className="text-gray-600">{examError}</p>
        </div>
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500 animate-pulse">Loading exam details...</div>
      </div>
    );
  }

  if (step === "done") {
    return (
      <div className="min-h-screen bg-green-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-green-700 mb-3">Registration Successful!</h2>
          <p className="text-gray-700 mb-4">
            Hi <strong>{form.name}</strong>! You have been registered for{" "}
            <strong>{exam.title}</strong>.
          </p>
          <div className="bg-blue-50 rounded-lg p-4 text-sm text-blue-800 text-left space-y-1">
            <p>📧 Exam link sent to: <strong>{form.email}</strong></p>
            <p>📱 Exam link sent to: <strong>{form.phone}</strong></p>
          </div>
          <p className="mt-4 text-gray-500 text-sm">
            Open the link from your email or SMS to start the exam. Do not close the tab once you begin.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
        {/* Header */}
        <div className="bg-blue-600 rounded-t-2xl px-8 py-6 text-white">
          <p className="text-blue-100 text-sm uppercase tracking-wider">Registration</p>
          <h1 className="text-2xl font-bold mt-1">{exam.title}</h1>
          <p className="text-blue-200 text-sm mt-1">{exam.totalMarks} Questions</p>
        </div>

        <div className="px-8 py-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {step === "form" && (
            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Enter your full name"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Branch *</label>
                <select
                  name="branch"
                  value={form.branch}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  required
                >
                  <option value="">Select your branch</option>
                  {BRANCHES.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Section *</label>
                <input
                  type="text"
                  name="section"
                  value={form.section}
                  onChange={handleChange}
                  placeholder="e.g., A, B, C"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address *</label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="your@email.com"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Number *</label>
                <input
                  type="tel"
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="10-digit mobile number"
                  maxLength={10}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors mt-2"
              >
                Continue to Verification
              </button>
            </form>
          )}

          {step === "otp" && (
            <div className="space-y-6">
              <p className="text-gray-600 text-sm">
                Verify your email and mobile number to complete registration.
              </p>

              {/* Email OTP */}
              <div className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-800">Email Verification</p>
                    <p className="text-sm text-gray-500">{form.email}</p>
                  </div>
                  {emailVerified ? (
                    <span className="text-green-600 font-semibold text-sm">✓ Verified</span>
                  ) : (
                    <button
                      onClick={() => sendOTP("email")}
                      disabled={sendingEmail || emailSent}
                      className="text-sm px-3 py-1.5 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 disabled:opacity-50"
                    >
                      {sendingEmail ? "Sending..." : emailSent ? "Resend" : "Send OTP"}
                    </button>
                  )}
                </div>
                {!emailVerified && emailSent && (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={emailOTP}
                      onChange={(e) => setEmailOTP(e.target.value)}
                      placeholder="Enter 6-digit OTP"
                      maxLength={6}
                      className="flex-1 border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={() => verifyOTP("email")}
                      disabled={verifyingEmail || emailOTP.length < 6}
                      className="px-4 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 disabled:opacity-50"
                    >
                      {verifyingEmail ? "..." : "Verify"}
                    </button>
                  </div>
                )}
              </div>

              {/* Phone OTP */}
              <div className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-800">Mobile Verification</p>
                    <p className="text-sm text-gray-500">{form.phone}</p>
                  </div>
                  {phoneVerified ? (
                    <span className="text-green-600 font-semibold text-sm">✓ Verified</span>
                  ) : (
                    <button
                      onClick={() => sendOTP("phone")}
                      disabled={sendingPhone || phoneSent}
                      className="text-sm px-3 py-1.5 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 disabled:opacity-50"
                    >
                      {sendingPhone ? "Sending..." : phoneSent ? "Resend" : "Send OTP"}
                    </button>
                  )}
                </div>
                {!phoneVerified && phoneSent && (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={phoneOTP}
                      onChange={(e) => setPhoneOTP(e.target.value)}
                      placeholder="Enter 6-digit OTP"
                      maxLength={6}
                      className="flex-1 border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={() => verifyOTP("phone")}
                      disabled={verifyingPhone || phoneOTP.length < 6}
                      className="px-4 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 disabled:opacity-50"
                    >
                      {verifyingPhone ? "..." : "Verify"}
                    </button>
                  </div>
                )}
              </div>

              <button
                onClick={handleRegister}
                disabled={!emailVerified || !phoneVerified || submitting}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? "Registering..." : "Complete Registration"}
              </button>

              <button
                onClick={() => { setStep("form"); setError(""); }}
                className="w-full text-gray-500 text-sm hover:text-gray-700"
              >
                ← Back to form
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
