// "use client" makes this a Client Component. We need it because we use React
// hooks (useState/useEffect), the router, and read localStorage — all of which
// only work in the browser, not on the server.
"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AdminSidebar from "../../components/AdminSidebar";
import { useAuth } from "../../components/AuthContext";

// This is a NESTED layout: app/admin/layout.jsx wraps every page under /admin.
// We use it to PROTECT the whole admin section in one place (redirect visitors
// who aren't logged in) and to give admin pages their sidebar + header shell.
export default function AdminLayout({ children }) {
  const router = useRouter();
  const { user } = useAuth();          // the logged-in user, from AuthContext
  const [ready, setReady] = useState(false);

  // Runs once after the page mounts in the browser. If there's no saved token,
  // the visitor isn't logged in, so we send them to the login page.
  useEffect(() => {
    if (!localStorage.getItem("token")) {
      router.push("/login");
      return;
    }
    setReady(true);
  }, [router]);

  // Until we've checked for a token, show a placeholder so we don't flash the
  // dashboard to someone who's about to be redirected.
  if (!ready) {
    return <div className="min-h-screen grid place-items-center text-gray-400 animate-pulse">Loading dashboard…</div>;
  }

  // We check the user's "role" to decide whether to show admin content. But this
  // is only for a nice UI — the SERVER is the real guard: it returns 403
  // (Forbidden) if a non-admin tries an admin action. Never trust the browser
  // alone for security, because users can tamper with client-side code.
  // UI politeness — the SERVER (403) is the real guard on admin-only writes.
  const isAdmin = !user || user.role === "admin";

  // The classic dashboard layout: a fixed sidebar on the left, and the page
  // content (header + {children}) filling the rest on the right.
  return (
    <div className="flex bg-gray-100 min-h-screen">
      <AdminSidebar />
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-16 bg-white border-b flex items-center justify-between px-4 sm:px-6 sticky top-0 z-30">
          <h1 className="font-semibold text-gray-700">Admin Dashboard</h1>
          <Link href="/" className="text-sm text-brand hover:underline">← Back to shop</Link>
        </header>
        <main className="flex-1 p-4 sm:p-6">
          {/* Show the actual admin page if the user is an admin, otherwise
              show a friendly "Admins only" message. */}
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
