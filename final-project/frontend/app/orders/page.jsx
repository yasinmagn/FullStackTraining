// Client component: fetches the logged-in user's orders in the browser.
"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "../../components/AuthContext";
import { authedFetch } from "../../lib/api";

// useSearchParams() must live inside a <Suspense> boundary so Next.js can build
// this page without bailing out of static generation.
function OrdersList() {
  const { token } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const placed = params.get("placed");   // set after checkout, e.g. ?placed=12
  // null = "still loading"; an array (even empty) = "loaded". Drives the spinner below.
  const [orders, setOrders] = useState(null);

  // Fetch orders after the component mounts. useEffect runs in the browser only.
  useEffect(() => {
    const saved = localStorage.getItem("token");
    if (!saved) { router.push("/login"); return; } // guests can't have orders
    authedFetch("/orders", {}, saved)
      .then((res) => res.ok ? res.json() : [])
      .then(setOrders); // store the result, triggering a re-render
  }, [token, router]);

  if (!orders) return <p className="animate-pulse">Loading your orders…</p>;

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-4">My Orders</h1>
      {/* Confirmation banner, shown only right after a successful checkout. */}
      {placed && <p className="bg-green-100 text-green-800 rounded p-3 mb-4">Order #{placed} placed successfully!</p>}
      {orders.length === 0 && <p>No orders yet.</p>}
      <ul className="space-y-3">
        {orders.map((o) => (
          <li key={o.id} className="bg-white rounded-lg p-4 shadow">
            <div className="flex justify-between">
              <span className="font-semibold">Order #{o.id}</span>
              <span className="capitalize text-sm bg-gray-100 rounded px-2 py-1">{o.status}</span>
            </div>
            <p className="text-sm text-gray-500">{new Date(o.createdAt).toLocaleString()}</p>
            <ul className="text-sm mt-2">
              {o.items.map((i) => (
                <li key={i.id}>{i.product?.name} × {i.quantity} — ${Number(i.unitPrice) * i.quantity}</li>
              ))}
            </ul>
            <p className="font-bold mt-2">Total: ${o.total}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

// The exported page wraps OrdersList in <Suspense> (required because OrdersList
// uses useSearchParams). The fallback shows until the inner component is ready.
export default function OrdersPage() {
  return (
    <Suspense fallback={<p className="animate-pulse">Loading your orders…</p>}>
      <OrdersList />
    </Suspense>
  );
}
