import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="text-center max-w-xl">
        <div className="text-6xl mb-4">📝</div>
        <h1 className="text-4xl font-bold text-gray-900 mb-3">Exam Portal</h1>
        <p className="text-gray-600 mb-8">
          Online exam registration and assessment platform
        </p>
        <div className="flex gap-4 justify-center flex-wrap">
          <Link
            href="/admin"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            Admin Login
          </Link>
        </div>
        <p className="mt-8 text-sm text-gray-500">
          Students: Open your exam registration link or scan the QR code shared by your institution.
        </p>
      </div>
    </div>
  );
}
