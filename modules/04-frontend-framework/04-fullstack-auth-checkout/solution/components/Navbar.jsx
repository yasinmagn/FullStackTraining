"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "./CartContext";
import { useAuth } from "./AuthContext";

function NavLink({ href, children, highlight }) {
  const pathname = usePathname();
  const active = pathname === href;
  return (
    <Link
      href={href}
      className={[
        "rounded-full px-3 py-1.5 transition-colors",
        highlight
          ? "bg-amber-400 text-emerald-900 font-semibold hover:bg-amber-300"
          : active
          ? "bg-emerald-800 text-white"
          : "text-emerald-50 hover:bg-emerald-800/70",
      ].join(" ")}
    >
      {children}
    </Link>
  );
}

export default function Navbar() {
  const { items } = useCart();
  const { user, logout } = useAuth();
  const count = items.reduce((s, i) => s + i.quantity, 0);

  return (
    <header className="sticky top-0 z-40 bg-gradient-to-r from-emerald-700 to-emerald-600 text-white shadow-md">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-3 px-4 sm:px-6 py-3">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg shrink-0">
          <span className="grid place-items-center w-9 h-9 rounded-xl bg-white text-emerald-700 text-xl shadow-sm">🛒</span>
          <span className="tracking-tight">SooqOnline</span>
        </Link>

        <nav className="flex items-center gap-1 sm:gap-1.5 text-sm">
          <NavLink href="/products">Products</NavLink>

          <Link
            href="/cart"
            className="relative inline-flex items-center gap-2 rounded-full bg-emerald-800/60 hover:bg-emerald-800 px-3 py-1.5 transition-colors"
          >
            <span>Cart</span>
            <span className="min-w-[1.25rem] h-5 grid place-items-center rounded-full bg-white text-emerald-700 text-xs font-bold px-1">
              {count}
            </span>
          </Link>

          {user ? (
            <>
              <NavLink href="/orders">My Orders</NavLink>
              {user.role === "admin" && (
                <NavLink href="/admin" highlight>Dashboard</NavLink>
              )}
              <span className="hidden md:inline-flex items-center gap-2 rounded-full bg-emerald-800/50 pl-1 pr-3 py-1">
                <span className="w-6 h-6 grid place-items-center rounded-full bg-white text-emerald-700 text-xs font-bold">
                  {user.name?.[0]?.toUpperCase() || "U"}
                </span>
                <span className="text-emerald-50">Hello, {user.name}</span>
              </span>
              <button
                onClick={logout}
                className="rounded-full border border-white/40 hover:bg-white hover:text-emerald-700 px-3 py-1.5 transition-colors"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <NavLink href="/login">Login</NavLink>
              <Link
                href="/register"
                className="rounded-full bg-white text-emerald-700 font-semibold px-3 py-1.5 hover:bg-emerald-50 transition-colors"
              >
                Register
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
