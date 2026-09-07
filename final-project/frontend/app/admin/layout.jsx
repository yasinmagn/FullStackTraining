"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AdminSidebar from "../../components/AdminSidebar";
import { useAuth } from "../../components/AuthContext";

export default function AdminLayout({ children }) {
  const router = useRouter();
  const { user } = useAuth();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem("token")) {
      router.push("/login");
      return;
    }
    setReady(true);
  }, [router]);

  if (!ready) {
    return <div className="min-h-screen grid place-items-center text-gray-400 animate-pulse">Loading dashboard…</div>;
  }

  // UI politeness — the SERVER (403) is the real guard on admin-only writes.
  const isAdmin = !user || user.role === "admin";

  return (
    <div className="flex bg-gray-100 min-h-screen">
      <AdminSidebar />
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-16 bg-white border-b flex items-center justify-between px-4 sm:px-6 sticky top-0 z-30">
          <h1 className="font-semibold text-gray-700">Admin Dashboard</h1>
          <Link href="/" className="text-sm text-emerald-700 hover:underline">← Back to shop</Link>
        </header>
        <main className="flex-1 p-4 sm:p-6">
          {isAdmin ? (
            children
          ) : (
            <div className="bg-white rounded-xl p-8 text-center shadow-sm">
              <p className="text-red-600 font-semibold">Admins only.</p>
              <p className="text-sm text-gray-500 mt-1">Your account doesn’t have access to this area.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
