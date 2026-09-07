// Client Component: reads the cart and user from context and the current URL.
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "./CartContext";
import { useAuth } from "./AuthContext";

// A single navigation link that highlights itself when it's the active page.
function NavLink({ href, children }) {
  const pathname = usePathname();
  const active = href === "/" ? pathname === "/" : pathname?.startsWith(href);
  return (
    <Link
      href={href}
      className={`px-3 py-2 text-sm rounded-lg transition-colors ${
        active ? "text-brand font-semibold" : "text-ink-soft hover:text-ink hover:bg-sand"
      }`}
    >
      {children}
    </Link>
  );
}

export default function Navbar() {
  const { items } = useCart();          // shared cart, for the item-count badge
  const { user, logout } = useAuth();   // logged-in user (or null), for the right side
  const count = items.reduce((s, i) => s + i.quantity, 0); // total items in cart

  return (
    <header className="sticky top-0 z-40 bg-white/85 backdrop-blur border-b border-line">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-3 px-4 sm:px-6 h-16">
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <span className="grid place-items-center w-9 h-9 rounded-xl bg-brand text-white text-lg shadow-sm">🛒</span>
          <span className="font-display font-bold text-lg tracking-tight">SooqOnline</span>
        </Link>

        <nav className="flex items-center gap-0.5 sm:gap-1">
          <NavLink href="/products">Products</NavLink>
          {/* Only show "Orders" to logged-in users. */}
          {user && <NavLink href="/orders">Orders</NavLink>}
          {/* Only admins see the Dashboard link (their role comes from the token). */}
          {user?.role === "admin" && (
            <Link
              href="/admin"
              className="px-3 py-2 text-sm rounded-lg text-gold-deep font-semibold hover:bg-gold-soft transition-colors"
            >
              Dashboard
            </Link>
          )}

          <Link
            href="/cart"
            className="ml-1 relative inline-flex items-center gap-2 rounded-full bg-brand text-white hover:bg-brand-deep px-3.5 py-2 text-sm transition-colors"
          >
            <span>Cart</span>
            <span className="min-w-[1.25rem] h-5 grid place-items-center rounded-full bg-white text-brand text-xs font-bold px-1">
              {count}
            </span>
          </Link>

          {/* Logged in: show the user's avatar + Logout. Logged out: show
              Login/Register. This is a JSX if/else using the ? : operator. */}
          {user ? (
            <div className="flex items-center gap-2 pl-1 sm:pl-2">
              <span
                title={`${user.name} · ${user.role}`}
                className="hidden md:grid place-items-center w-8 h-8 rounded-full bg-brand-soft text-brand text-sm font-bold font-display"
              >
                {user.name?.[0]?.toUpperCase() || "U"}
              </span>
              <button onClick={logout} className="text-sm text-ink-soft hover:text-ink px-2 py-1">
                Logout
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1 pl-1">
              <NavLink href="/login">Login</NavLink>
              <Link
                href="/register"
                className="rounded-full bg-ink text-white text-sm font-medium px-4 py-2 hover:bg-brand-deep transition-colors"
              >
                Register
              </Link>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
