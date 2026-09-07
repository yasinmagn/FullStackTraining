"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "./AuthContext";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: "▚" },
  { href: "/admin/products", label: "Products", icon: "▤" },
  { href: "/orders", label: "My Orders", icon: "▦" },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <aside className="w-16 sm:w-60 shrink-0 bg-brand-deep text-brand-soft flex flex-col min-h-screen sticky top-0">
      <Link href="/" className="flex items-center gap-2 px-3 sm:px-5 h-16 border-b border-white/10 font-bold">
        <span className="grid place-items-center w-9 h-9 rounded-xl bg-white text-brand text-xl shrink-0">🛒</span>
        <span className="hidden sm:block font-display font-bold tracking-tight">SooqOnline</span>
      </Link>

      <nav className="flex-1 p-2 sm:p-3 space-y-1">
        <p className="hidden sm:block px-3 pt-2 pb-1 text-[11px] uppercase tracking-wider text-white/45">Admin</p>
        {NAV.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                active ? "bg-brand text-white" : "text-brand-soft/90 hover:bg-white/10",
              ].join(" ")}
            >
              <span className="w-5 text-center">{item.icon}</span>
              <span className="hidden sm:block">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-2 sm:p-3 border-t border-white/10">
        <div className="hidden sm:flex items-center gap-2 px-2 py-2">
          <span className="w-8 h-8 grid place-items-center rounded-full bg-white text-brand text-sm font-bold">
            {user?.name?.[0]?.toUpperCase() || "A"}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{user?.name || "Admin"}</p>
            <p className="text-xs text-white/45 capitalize">{user?.role || "admin"}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full mt-1 rounded-lg px-3 py-2 text-sm text-brand-soft/90 hover:bg-white/10 flex items-center gap-3"
        >
          <span className="w-5 text-center">⎋</span>
          <span className="hidden sm:block">Logout</span>
        </button>
      </div>
    </aside>
  );
}
