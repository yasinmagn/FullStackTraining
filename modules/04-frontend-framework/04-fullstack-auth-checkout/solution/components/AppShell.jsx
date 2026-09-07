// Client Component: it reads the current URL with usePathname() to decide which
// layout to show, and that hook only runs in the browser.
"use client";
import { usePathname } from "next/navigation";
import Navbar from "./Navbar";

// Storefront chrome (navbar + footer) for every page EXCEPT the admin dashboard,
// which brings its own sidebar layout (app/admin/layout.jsx).
export default function AppShell({ children }) {
  const pathname = usePathname();
  // On /admin pages, render the page bare so the admin layout's sidebar takes
  // over instead of showing the shop navbar/footer.
  if (pathname?.startsWith("/admin")) return <>{children}</>;

  return (
    <>
      <Navbar />
      <main className="max-w-6xl w-full mx-auto p-4 sm:p-6 flex-1">{children}</main>
      <footer className="text-center text-sm text-gray-500 py-6">
        © 2026 SooqOnline · Hargeisa, Somaliland
      </footer>
    </>
  );
}
