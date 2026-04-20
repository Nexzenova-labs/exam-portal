"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

interface Student {
  id: string;
  name: string;
  branch: string;
  section: string;
  email: string;
  phone: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  linkSent: boolean;
  attemptsUsed: number;
  maxAttempts: number;
  sessionStatus: string;
  score: number | null;
  totalMarks: number;
  percentage: number | null;
  submittedAt: string | null;
  registeredAt: string;
}

interface ExamInfo {
  id: string;
  title: string;
  totalMarks: number;
  isActive: boolean;
}

export default function ExamScores() {
  const { examId } = useParams<{ examId: string }>();
  const router = useRouter();
  const [exam, setExam] = useState<ExamInfo | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [grantingId, setGrantingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  async function load() {
    const res = await fetch(`/api/admin/exams/${examId}`);
    if (res.status === 401) { router.push("/admin"); return; }
    const data = await res.json();
    if (data.error) { router.push("/admin/dashboard"); return; }
    setExam(data.exam);
    setStudents(data.students);
    setLoading(false);
  }

  useEffect(() => { load(); }, [examId]);

  function downloadCSV() {
    const headers = ["Name", "Branch", "Section", "Email", "Phone", "Status", "Score", "Total", "Percentage", "Attempts", "Registered At", "Submitted At"];
    const rows = students.map((s) => [
      s.name,
      s.branch,
      s.section,
      s.email,
      s.phone,
      s.score !== null ? "Submitted" : s.sessionStatus === "closed" ? "Tab Closed" : s.sessionStatus === "active" ? "In Progress" : "Registered",
      s.score ?? "",
      s.totalMarks,
      s.percentage !== null ? `${s.percentage.toFixed(1)}%` : "",
      `${s.attemptsUsed}/${s.maxAttempts}`,
      new Date(s.registeredAt).toLocaleString(),
      s.submittedAt ? new Date(s.submittedAt).toLocaleString() : "",
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${exam?.title ?? "exam"}_results.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function grantAttempt(registrationId: string) {
    setGrantingId(registrationId);
    await fetch("/api/admin/grant-attempt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ registrationId }),
    });
    setGrantingId(null);
    load();
  }

  const filtered = students.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase()) ||
      s.branch.toLowerCase().includes(search.toLowerCase()) ||
      s.section.toLowerCase().includes(search.toLowerCase())
  );

  const submitted = students.filter((s) => s.score !== null).length;
  const avgScore =
    submitted > 0
      ? students.filter((s) => s.score !== null).reduce((a, s) => a + (s.percentage ?? 0), 0) / submitted
      : 0;

  function statusBadge(s: Student) {
    if (s.score !== null) return <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Submitted</span>;
    if (s.sessionStatus === "active") return <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">In Progress</span>;
    if (s.sessionStatus === "closed") return <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">Tab Closed</span>;
    if (s.linkSent) return <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Link Sent</span>;
    return <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Registered</span>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-blue-700 text-white px-6 py-4 flex items-center gap-4 shadow">
        <button onClick={() => router.push("/admin/dashboard")} className="text-blue-200 hover:text-white text-sm">
          ← Back
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold">{exam?.title}</h1>
          <p className="text-blue-200 text-xs">Exam Results & Student Management</p>
        </div>
        <button
          onClick={downloadCSV}
          disabled={students.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-white text-blue-700 rounded-lg text-sm font-semibold hover:bg-blue-50 disabled:opacity-40 transition-colors"
        >
          ⬇ Download CSV
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-gray-500 animate-pulse">Loading...</div>
      ) : (
        <div className="max-w-6xl mx-auto px-4 py-6">
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[
              { label: "Registered", value: students.length, color: "blue" },
              { label: "Submitted", value: submitted, color: "green" },
              { label: "Avg Score", value: `${avgScore.toFixed(1)}%`, color: "purple" },
              { label: "Total Marks", value: exam?.totalMarks, color: "orange" },
            ].map((stat) => (
              <div key={stat.label} className="bg-white rounded-xl shadow p-4 text-center">
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-sm text-gray-500">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Search */}
          <div className="mb-4">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, branch, section..."
              className="w-full border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    {["Name", "Branch/Section", "Email", "Phone", "Status", "Score", "Attempts", "Actions"].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                        No students found
                      </td>
                    </tr>
                  ) : (
                    filtered.map((s) => (
                      <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">{s.name}</td>
                        <td className="px-4 py-3 text-gray-500">
                          <div className="text-xs">{s.branch}</div>
                          <div className="text-xs text-gray-400">Sec: {s.section}</div>
                        </td>
                        <td className="px-4 py-3 text-gray-600 text-xs">{s.email}</td>
                        <td className="px-4 py-3 text-gray-600 text-xs">{s.phone}</td>
                        <td className="px-4 py-3">{statusBadge(s)}</td>
                        <td className="px-4 py-3">
                          {s.score !== null ? (
                            <div>
                              <span className={`font-bold ${(s.percentage ?? 0) >= 40 ? "text-green-700" : "text-red-600"}`}>
                                {s.score}/{s.totalMarks}
                              </span>
                              <span className="text-gray-400 text-xs ml-1">({s.percentage?.toFixed(1)}%)</span>
                            </div>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs">
                          {s.attemptsUsed}/{s.maxAttempts}
                        </td>
                        <td className="px-4 py-3">
                          {(s.sessionStatus === "closed" || s.attemptsUsed >= s.maxAttempts) && (
                            <button
                              onClick={() => grantAttempt(s.id)}
                              disabled={grantingId === s.id}
                              className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 whitespace-nowrap"
                            >
                              {grantingId === s.id ? "..." : "Grant Attempt"}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
