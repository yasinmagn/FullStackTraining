"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "../../components/CartContext";
import { useAuth } from "../../components/AuthContext";
import { authedFetch } from "../../lib/api";

const NICE_ERRORS = {
  INSUFFICIENT_STOCK: "Sorry, not enough stock for one of your items.",
  CART_EMPTY: "Your cart is empty.",
};

export default function CheckoutPage() {
  const { items, total, clear } = useCart();
  const { token } = useAuth();
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [placing, setPlacing] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem("token")) router.push("/login");
  }, [router]);

  async function placeOrder() {
    setPlacing(true);
    setMessage("");
    const res = await authedFetch("/orders", {
      method: "POST",
      body: JSON.stringify({
        items: items.map(({ id, quantity }) => ({ productId: id, quantity })),
      }),
    }, token);

    if (res.ok) {
      const order = await res.json();
      clear();
      router.push(`/orders?placed=${order.id}`);
    } else {
      const { error } = await res.json();
      setMessage(NICE_ERRORS[error] || error || "Something went wrong.");
      setPlacing(false);
    }
  }

  return (
    <div className="max-w-md mx-auto space-y-4">
      <h1 className="text-2xl font-bold">Checkout</h1>
      <ul className="bg-white rounded-xl border border-line shadow-card p-4 divide-y divide-line">
        {items.map((i) => (
          <li key={i.id} className="py-2.5 flex justify-between text-sm">
            <span className="text-ink-soft">{i.name} × {i.quantity}</span>
            <span className="font-medium">${Number(i.price) * i.quantity}</span>
          </li>
        ))}
        <li className="pt-3 flex justify-between items-center">
          <span className="text-muted">Total</span>
          <span className="font-display text-xl font-extrabold text-gold-deep">${total}</span>
        </li>
      </ul>
      {message && <p className="bg-red-50 text-red-600 text-sm rounded-lg px-3 py-2">{message}</p>}
      <button
        onClick={placeOrder}
        disabled={placing || items.length === 0}
        className="w-full rounded-full bg-brand hover:bg-brand-deep disabled:bg-gray-300 disabled:cursor-not-allowed text-white p-3 font-medium transition-colors"
      >
        {placing ? "Placing order…" : `Place order · $${total}`}
      </button>
    </div>
  );
}
