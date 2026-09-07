"use client";
import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "../../components/AuthContext";
import { authedFetch } from "../../lib/api";

// TODO 7: on mount, redirect to /login if there's no saved token; otherwise
// GET /orders (authed) and setOrders. Then render each order's id, status, date,
// its items, and total. Show a success banner when ?placed=<id> is present.
export default function OrdersPage() {
  const { token } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const placed = params.get("placed");
  const [orders, setOrders] = useState(null);

  useEffect(() => {
  }, [token, router]);

  if (!orders) return <p className="animate-pulse">Loading your orders…</p>;

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-4">My Orders</h1>
      {placed && <p className="bg-green-100 text-green-800 rounded p-3 mb-4">Order #{placed} placed successfully!</p>}
      {orders.length === 0 && <p>No orders yet.</p>}
      {/* TODO 7: list orders here */}
    </div>
  );
}
