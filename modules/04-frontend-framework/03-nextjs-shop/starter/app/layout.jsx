import Link from "next/link";
import "./globals.css";
import { CartProvider } from "../components/CartContext";
import CartBadge from "../components/CartBadge";

export const metadata = { title: "SooqOnline" };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900">
        <CartProvider>
          <header className="flex justify-between items-center px-6 py-3 bg-emerald-700 text-white">
            <Link href="/" className="text-xl font-bold">SooqOnline</Link>
            <nav className="flex gap-4 items-center">
              <Link href="/products">Products</Link>
              <CartBadge />
              {/* Lab 14 adds Login / user greeting here */}
            </nav>
          </header>
          <main className="max-w-5xl mx-auto p-6">{children}</main>
          <footer className="text-center text-sm text-gray-500 py-6">© 2026 SooqOnline</footer>
        </CartProvider>
      </body>
    </html>
  );
}
