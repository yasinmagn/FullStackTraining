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
      <ul className="bg-white rounded-lg p-4 shadow divide-y">
        {items.map((i) => (
          <li key={i.id} className="py-2 flex justify-between">
            <span>{i.name} × {i.quantity}</span>
            <span>${Number(i.price) * i.quantity}</span>
          </li>
        ))}
      </ul>
      {message && <p className="text-red-600">{message}</p>}
      <button onClick={placeOrder} disabled={placing || items.length === 0}
              className="w-full bg-emerald-700 disabled:bg-gray-400 text-white rounded-md p-3 font-semibold">
        {placing ? "Placing order…" : `Place order — $${total}`}
      </button>
    </div>
  );
}
