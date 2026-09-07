// layout.jsx is a SPECIAL Next.js App Router file. The ROOT layout defines the
// shared shell (html/body, header, footer) that wraps EVERY page. It renders
// once and stays mounted as users navigate between pages.
// This is a Server Component by default (no "use client"), so it runs on the
// server. That's fine here because it only renders static structure.
import Link from "next/link";
import "./globals.css";
import { CartProvider } from "../components/CartContext";
import CartBadge from "../components/CartBadge";

// Exporting "metadata" lets Next.js set the page <title> and description
// (great for SEO) without us writing <head> tags by hand.
export const metadata = { title: "SooqOnline", description: "Shop online in Somaliland" };

// "children" is the current page's content, injected into the layout below.
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900 min-h-screen flex flex-col">
        {/* CartProvider wraps everything so any client component (like the */}
        {/* CartBadge or Add-to-Cart buttons) can access the shared cart state. */}
        <CartProvider>
          <header className="flex justify-between items-center px-6 py-3 bg-emerald-700 text-white">
            <Link href="/" className="text-xl font-bold">SooqOnline</Link>
            <nav className="flex gap-4 items-center">
              <Link href="/products">Products</Link>
              {/* Live cart counter, updates as items are added/removed */}
              <CartBadge />
            </nav>
          </header>
          {/* Each route's page.jsx renders here, in place of {children} */}
          <main className="max-w-5xl w-full mx-auto p-6 flex-1">{children}</main>
          <footer className="text-center text-sm text-gray-500 py-6">
            © 2026 SooqOnline · Hargeisa, Somaliland
          </footer>
        </CartProvider>
      </body>
    </html>
  );
}
