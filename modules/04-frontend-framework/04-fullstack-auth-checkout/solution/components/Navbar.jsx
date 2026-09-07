"use client";
import Link from "next/link";
import { useCart } from "./CartContext";
import { useAuth } from "./AuthContext";

export default function Navbar() {
  const { items } = useCart();
  const { user, logout } = useAuth();

  return (
    <header className="flex justify-between items-center px-6 py-3 bg-emerald-700 text-white">
      <Link href="/" className="text-xl font-bold">SooqOnline</Link>
      <nav className="flex gap-4 items-center text-sm sm:text-base">
        <Link href="/products">Products</Link>
        <Link href="/cart">Cart ({items.reduce((s, i) => s + i.quantity, 0)})</Link>
        {user ? (
          <>
            <Link href="/orders">My Orders</Link>
            {user.role === "admin" && <Link href="/admin/products">Admin</Link>}
            <span className="hidden sm:inline">Hello, {user.name}</span>
            <button onClick={logout} className="underline">Logout</button>
          </>
        ) : (
          <>
            <Link href="/login">Login</Link>
            <Link href="/register" className="bg-white text-emerald-700 px-3 py-1 rounded">Register</Link>
          </>
        )}
      </nav>
    </header>
  );
}
