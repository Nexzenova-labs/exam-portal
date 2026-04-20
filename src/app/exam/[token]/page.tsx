"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "next/navigation";

type ExamStep = "validate" | "identity" | "instructions" | "exam" | "submitted" | "error";

interface Question {
  question: string;
  options: string[];
}

interface ExamData {
  title: string;
  totalMarks: number;
  questions: Question[];
}

export default function ExamPage() {
  const { token } = useParams<{ token: string }>();
  const [step, setStep] = useState<ExamStep>("validate");
  const [errorMsg, setErrorMsg] = useState("");

  // Identity confirm
  const [regInfo, setRegInfo] = useState<{ id: string; name: string; email: string; phone: string } | null>(null);
  const [sessionId, setSessionId] = useState("");
  const [identityEmail, setIdentityEmail] = useState("");
  const [identityPhone, setIdentityPhone] = useState("");
  const [identityError, setIdentityError] = useState("");
  const [verifying, setVerifying] = useState(false);

  // Exam state
  const [exam, setExam] = useState<ExamData | null>(null);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [current, setCurrent] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ score: number; totalMarks: number; percentage: string; passed: boolean } | null>(null);

  // Tab close detection
  const tabCloseSent = useRef(false);

  const sendTabClose = useCallback(async (sid: string) => {
    if (tabCloseSent.current) return;
    tabCloseSent.current = true;
    navigator.sendBeacon(
      "/api/exam/tab-close",
      new Blob([JSON.stringify({ token, sessionId: sid })], { type: "application/json" })
    );
  }, [token]);

  // Validate token on mount
  useEffect(() => {
    if (!token) return;
    fetch("/api/exam/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.error) { setErrorMsg(d.error); setStep("error"); return; }
        setRegInfo(d.registration);
        setSessionId(d.sessionId);
        setStep("identity");
      })
      .catch(() => { setErrorMsg("Failed to validate exam link."); setStep("error"); });
  }, [token]);

  // Tab visibility listener (only during exam)
  useEffect(() => {
    if (step !== "exam" || !sessionId) return;

    function handleVisibilityChange() {
      if (document.visibilityState === "hidden") {
        sendTabClose(sessionId);
        setErrorMsg("Exam ended: you switched tabs or closed the window.");
        setStep("error");
      }
    }

    function handleBeforeUnload(e: BeforeUnloadEvent) {
      sendTabClose(sessionId);
      e.preventDefault();
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [step, sessionId, sendTabClose]);

  async function confirmIdentity(e: React.FormEvent) {
    e.preventDefault();
    setIdentityError("");
    setVerifying(true);

    const res = await fetch("/api/exam/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, email: identityEmail, phone: identityPhone }),
    });
    const data = await res.json();
    setVerifying(false);

    if (data.error) { setIdentityError(data.error); return; }

    setExam(data.exam);
    setAnswers(new Array(data.exam.questions.length).fill(null));
    setSessionId(data.sessionId || sessionId);
    setStep("instructions");
  }

  async function submitExam() {
    setSubmitting(true);
    const res = await fetch("/api/exam/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, sessionId, answers }),
    });
    const data = await res.json();
    setSubmitting(false);

    if (data.error) { setErrorMsg(data.error); setStep("error"); return; }

    setResult(data);
    setStep("submitted");
  }

  function selectAnswer(idx: number) {
    setAnswers((a) => {
      const copy = [...a];
      copy[current] = idx;
      return copy;
    });
  }

  // ---- RENDER ----

  if (step === "validate") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500 animate-pulse">Validating exam link...</p>
      </div>
    );
  }

  if (step === "error") {
    return (
      <div className="min-h-screen bg-red-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-5xl mb-4">🚫</div>
          <h2 className="text-xl font-bold text-red-600 mb-2">Exam Unavailable</h2>
          <p className="text-gray-600">{errorMsg}</p>
          <p className="mt-4 text-sm text-gray-400">Contact your exam administrator for assistance.</p>
        </div>
      </div>
    );
  }

  if (step === "identity") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
          <div className="bg-blue-600 rounded-t-2xl px-8 py-6 text-white">
            <h1 className="text-xl font-bold">Identity Verification</h1>
            <p className="text-blue-200 text-sm mt-1">Confirm your details to proceed</p>
          </div>
          <form onSubmit={confirmIdentity} className="px-8 py-6 space-y-4">
            {identityError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {identityError}
              </div>
            )}
            <div>
              <p className="text-sm text-gray-500 mb-3">
                Enter the email and mobile number you used to register:
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
              <input
                type="email"
                value={identityEmail}
                onChange={(e) => setIdentityEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Number</label>
              <input
                type="tel"
                value={identityPhone}
                onChange={(e) => setIdentityPhone(e.target.value)}
                placeholder="10-digit mobile number"
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <button
              type="submit"
              disabled={verifying}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {verifying ? "Verifying..." : "Confirm Identity"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (step === "instructions") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
          <div className="bg-blue-600 rounded-t-2xl px-8 py-6 text-white">
            <h1 className="text-xl font-bold">{exam?.title}</h1>
            <p className="text-blue-200 text-sm mt-1">{exam?.totalMarks} Questions</p>
          </div>
          <div className="px-8 py-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Instructions</h2>
            <ul className="space-y-3 text-gray-700 text-sm">
              <li className="flex gap-3">
                <span className="text-2xl leading-none">⚠️</span>
                <span><strong>Do NOT close, minimize, or switch tabs</strong> during the exam. Your exam will automatically end and be marked as incomplete.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-2xl leading-none">📋</span>
                <span>There are <strong>{exam?.totalMarks} multiple-choice questions</strong>. Each carries 1 mark.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-2xl leading-none">✅</span>
                <span>You can navigate between questions and change your answers before submitting.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-2xl leading-none">📧</span>
                <span>Your score and answer sheet will be emailed to you immediately after submission.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-2xl leading-none">🔒</span>
                <span>Each student gets a <strong>maximum of 2 attempts</strong>. Additional attempts must be granted by admin.</span>
              </li>
            </ul>
            <button
              onClick={() => setStep("exam")}
              className="mt-6 w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors"
            >
              I Understand — Start Exam
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === "exam" && exam) {
    const q = exam.questions[current];
    const answered = answers.filter((a) => a !== null).length;
    const progress = ((current + 1) / exam.questions.length) * 100;

    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        {/* Header */}
        <div className="bg-blue-600 text-white px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow">
          <div>
            <p className="font-semibold">{exam.title}</p>
            <p className="text-blue-200 text-xs">Q {current + 1} of {exam.questions.length}</p>
          </div>
          <div className="text-right">
            <p className="text-sm">{answered}/{exam.questions.length} answered</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full h-1 bg-blue-200">
          <div className="h-1 bg-white transition-all" style={{ width: `${progress}%` }} />
        </div>

        {/* Question */}
        <div className="flex-1 flex flex-col items-center px-4 py-6">
          <div className="bg-white rounded-2xl shadow w-full max-w-2xl">
            <div className="p-6 border-b">
              <p className="text-xs text-blue-600 font-semibold uppercase tracking-wider mb-2">
                Question {current + 1}
              </p>
              <p className="text-gray-900 text-lg font-medium leading-relaxed">{q.question}</p>
            </div>
            <div className="p-6 space-y-3">
              {q.options.map((opt, i) => (
                <button
                  key={i}
                  onClick={() => selectAnswer(i)}
                  className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all text-sm font-medium ${
                    answers[current] === i
                      ? "border-blue-600 bg-blue-50 text-blue-700"
                      : "border-gray-200 hover:border-blue-300 hover:bg-blue-50 text-gray-700"
                  }`}
                >
                  <span className="font-bold mr-2">{String.fromCharCode(65 + i)}.</span>
                  {opt}
                </button>
              ))}
            </div>

            {/* Navigation */}
            <div className="px-6 pb-6 flex justify-between items-center">
              <button
                onClick={() => setCurrent((c) => Math.max(0, c - 1))}
                disabled={current === 0}
                className="px-5 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40"
              >
                ← Previous
              </button>

              {current < exam.questions.length - 1 ? (
                <button
                  onClick={() => setCurrent((c) => c + 1)}
                  className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700"
                >
                  Next →
                </button>
              ) : (
                <button
                  onClick={submitExam}
                  disabled={submitting}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 disabled:opacity-50"
                >
                  {submitting ? "Submitting..." : "Submit Exam ✓"}
                </button>
              )}
            </div>
          </div>

          {/* Question grid */}
          <div className="w-full max-w-2xl mt-4 bg-white rounded-xl shadow p-4">
            <p className="text-xs text-gray-500 mb-3 font-medium">Question Navigator</p>
            <div className="flex flex-wrap gap-2">
              {exam.questions.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrent(i)}
                  className={`w-9 h-9 rounded-lg text-sm font-semibold border-2 transition-all ${
                    i === current
                      ? "border-blue-600 bg-blue-600 text-white"
                      : answers[i] !== null
                      ? "border-green-500 bg-green-50 text-green-700"
                      : "border-gray-200 text-gray-500 hover:border-blue-300"
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
            <div className="flex gap-4 mt-3 text-xs text-gray-500">
              <span className="flex items-center gap-1"><span className="w-3 h-3 bg-green-100 border-2 border-green-500 rounded inline-block"></span> Answered</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 bg-white border-2 border-gray-200 rounded inline-block"></span> Not answered</span>
            </div>
          </div>

          {/* Final submit button when all answered */}
          {answered === exam.questions.length && current < exam.questions.length - 1 && (
            <div className="w-full max-w-2xl mt-4">
              <button
                onClick={submitExam}
                disabled={submitting}
                className="w-full py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                {submitting ? "Submitting..." : "All answered — Submit Exam ✓"}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (step === "submitted" && result) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md text-center">
          <div className={`rounded-t-2xl px-8 py-6 text-white ${result.passed ? "bg-green-600" : "bg-orange-500"}`}>
            <div className="text-4xl mb-2">{result.passed ? "🎉" : "📊"}</div>
            <h1 className="text-2xl font-bold">{result.passed ? "Congratulations!" : "Exam Completed"}</h1>
          </div>
          <div className="px-8 py-6 space-y-4">
            <div className="flex gap-4 justify-center">
              <div className="flex-1 bg-blue-50 rounded-xl p-4">
                <p className="text-3xl font-bold text-blue-700">{result.score}/{result.totalMarks}</p>
                <p className="text-gray-500 text-sm">Score</p>
              </div>
              <div className={`flex-1 rounded-xl p-4 ${result.passed ? "bg-green-50" : "bg-red-50"}`}>
                <p className={`text-3xl font-bold ${result.passed ? "text-green-700" : "text-red-600"}`}>
                  {result.percentage}%
                </p>
                <p className="text-gray-500 text-sm">{result.passed ? "Passed" : "Failed"}</p>
              </div>
            </div>
            <p className="text-gray-600 text-sm">
              Your detailed result and answer sheet have been sent to your registered email address.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
