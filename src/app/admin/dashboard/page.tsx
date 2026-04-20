"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

interface ExamItem {
  id: string;
  title: string;
  totalQuestions: number;
  totalMarks: number;
  isActive: boolean;
  registrationCount: number;
  registerLink: string;
  qrCode: string;
  createdAt: string;
}

export default function Dashboard() {
  const router = useRouter();
  const [exams, setExams] = useState<ExamItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [examTitle, setExamTitle] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [newExam, setNewExam] = useState<{ title: string; registerLink: string; qrCode: string; totalQuestions: number } | null>(null);
  const [activeTab, setActiveTab] = useState<"exams" | "upload">("exams");

  async function loadExams() {
    const res = await fetch("/api/admin/exams");
    if (res.status === 401) { router.push("/admin"); return; }
    const data = await res.json();
    setExams(data.exams || []);
    setLoading(false);
  }

  useEffect(() => { loadExams(); }, []);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!uploadFile) { setUploadError("Please select a file."); return; }
    setUploading(true);
    setUploadError("");
    setNewExam(null);

    const fd = new FormData();
    fd.append("file", uploadFile);
    if (examTitle) fd.append("title", examTitle);

    const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
    const data = await res.json();
    setUploading(false);

    if (data.error) { setUploadError(data.error); return; }
    setNewExam(data.exam);
    setExamTitle("");
    setUploadFile(null);
    loadExams();
  }

  async function toggleExam(examId: string, isActive: boolean) {
    await fetch("/api/admin/exams", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ examId, isActive }),
    });
    loadExams();
  }

  async function logout() {
    await fetch("/api/admin/login", { method: "DELETE" });
    router.push("/admin");
  }

  function copyLink(link: string) {
    navigator.clipboard.writeText(link);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Nav */}
      <div className="bg-blue-700 text-white px-6 py-4 flex items-center justify-between shadow">
        <div>
          <h1 className="text-xl font-bold">Exam Portal — Admin</h1>
          <p className="text-blue-200 text-xs">Manage exams, students & results</p>
        </div>
        <button
          onClick={logout}
          className="text-sm px-4 py-2 bg-blue-800 hover:bg-blue-900 rounded-lg transition-colors"
        >
          Logout
        </button>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab("exams")}
            className={`px-5 py-2.5 rounded-lg font-medium text-sm transition-colors ${activeTab === "exams" ? "bg-blue-600 text-white" : "bg-white text-gray-600 hover:bg-gray-100 border"}`}
          >
            All Exams ({exams.length})
          </button>
          <button
            onClick={() => setActiveTab("upload")}
            className={`px-5 py-2.5 rounded-lg font-medium text-sm transition-colors ${activeTab === "upload" ? "bg-blue-600 text-white" : "bg-white text-gray-600 hover:bg-gray-100 border"}`}
          >
            + Upload New Exam
          </button>
        </div>

        {/* Upload tab */}
        {activeTab === "upload" && (
          <div className="bg-white rounded-2xl shadow p-6 max-w-2xl">
            <h2 className="text-lg font-bold text-gray-900 mb-1">Upload Question Paper</h2>
            <p className="text-sm text-gray-500 mb-5">
              Supported: <strong>Excel (.xlsx/.xls)</strong>, <strong>CSV</strong>, <strong>PDF</strong>, <strong>Text (.txt/.md)</strong>
            </p>

            <div className="mb-4 p-4 bg-blue-50 rounded-lg text-sm text-blue-800">
              <p className="font-semibold mb-1">Excel/CSV format:</p>
              <code className="text-xs">Question | Option A | Option B | Option C | Option D | Answer (A/B/C/D)</code>
              <p className="font-semibold mt-2 mb-1">Text/PDF format:</p>
              <p className="text-xs">Questions numbered with options A) B) C) D) and ✅ marking correct answer</p>
            </div>

            <form onSubmit={handleUpload} className="space-y-4">
              {uploadError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {uploadError}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Exam Title (optional)</label>
                <input
                  type="text"
                  value={examTitle}
                  onChange={(e) => setExamTitle(e.target.value)}
                  placeholder="Leave blank to use filename"
                  className="w-full border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Question File *</label>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv,.pdf,.txt,.md"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  className="w-full border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 file:mr-3 file:py-1 file:px-3 file:border-0 file:bg-blue-50 file:text-blue-700 file:rounded file:text-sm"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={uploading}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {uploading ? "Processing..." : "Upload & Create Exam"}
              </button>
            </form>

            {/* New exam result */}
            {newExam && (
              <div className="mt-6 p-5 bg-green-50 border border-green-200 rounded-xl">
                <p className="font-bold text-green-700 text-lg mb-1">✅ Exam Created!</p>
                <p className="text-gray-700 mb-3">
                  <strong>{newExam.title}</strong> — {newExam.totalQuestions} questions
                </p>

                <div className="flex gap-4 items-start flex-wrap">
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-2">Registration QR Code:</p>
                    <Image src={newExam.qrCode} alt="QR" width={160} height={160} className="border rounded-lg" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-600 mb-2">Registration Link:</p>
                    <div className="flex gap-2">
                      <input
                        readOnly
                        value={newExam.registerLink}
                        className="flex-1 border rounded-lg px-3 py-2 text-sm bg-white min-w-0"
                      />
                      <button
                        onClick={() => copyLink(newExam.registerLink)}
                        className="px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 whitespace-nowrap"
                      >
                        Copy
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">Share this link or QR code with students to register.</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Exams tab */}
        {activeTab === "exams" && (
          <div className="space-y-4">
            {loading ? (
              <p className="text-gray-500 animate-pulse">Loading exams...</p>
            ) : exams.length === 0 ? (
              <div className="bg-white rounded-xl shadow p-8 text-center text-gray-500">
                <p className="text-4xl mb-2">📋</p>
                <p>No exams yet. Upload a question paper to create one.</p>
              </div>
            ) : (
              exams.map((exam) => (
                <div key={exam.id} className="bg-white rounded-xl shadow p-5">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-gray-900 text-lg">{exam.title}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${exam.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                          {exam.isActive ? "Active" : "Inactive"}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">
                        {exam.totalQuestions} questions · {exam.registrationCount} registered · Created {new Date(exam.createdAt).toLocaleDateString()}
                      </p>
                      <div className="flex gap-2 mt-3 flex-wrap">
                        <button
                          onClick={() => router.push(`/admin/dashboard/${exam.id}`)}
                          className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                        >
                          View Scores
                        </button>
                        <button
                          onClick={() => copyLink(exam.registerLink)}
                          className="px-4 py-1.5 border border-gray-300 text-gray-600 text-sm rounded-lg hover:bg-gray-50"
                        >
                          Copy Link
                        </button>
                        <button
                          onClick={() => toggleExam(exam.id, !exam.isActive)}
                          className={`px-4 py-1.5 text-sm rounded-lg ${exam.isActive ? "bg-red-50 text-red-600 hover:bg-red-100" : "bg-green-50 text-green-600 hover:bg-green-100"}`}
                        >
                          {exam.isActive ? "Deactivate" : "Activate"}
                        </button>
                      </div>
                    </div>
                    <Image src={exam.qrCode} alt="QR" width={90} height={90} className="border rounded-lg flex-shrink-0" />
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
