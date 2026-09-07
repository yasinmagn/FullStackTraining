// Client component: it submits the order (a POST) and reacts to the result.
"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "../../components/CartContext";
import { useAuth } from "../../components/AuthContext";
import { authedFetch } from "../../lib/api";

// Turn the backend's error codes into human-friendly messages for the shopper.
const NICE_ERRORS = {
  INSUFFICIENT_STOCK: "Sorry, not enough stock for one of your items.",
  CART_EMPTY: "Your cart is empty.",
};

export default function CheckoutPage() {
  const { items, total, clear } = useCart();
  const { token } = useAuth();          // JWT needed to POST the protected /orders route
  const router = useRouter();
  const [message, setMessage] = useState("");   // error text to show
  const [placing, setPlacing] = useState(false); // disables the button while submitting

  // Client-side guard: bounce guests to /login. The server still enforces auth too.
  useEffect(() => {
    if (!localStorage.getItem("token")) router.push("/login");
  }, [router]);

  async function placeOrder() {
    setPlacing(true);
    setMessage("");
    // Send the cart to the backend. authedFetch attaches the Bearer token for us.
    // The atomic stock check happens server-side inside a DB transaction.
    const res = await authedFetch("/orders", {
      method: "POST",
      body: JSON.stringify({
        items: items.map(({ id, quantity }) => ({ productId: id, quantity })),
      }),
    }, token);

    if (res.ok) {
      // Success: empty the cart and go to the orders page with a confirmation flag.
      const order = await res.json();
      clear();
      router.push(`/orders?placed=${order.id}`);
    } else {
      // Failure (e.g. out of stock): show a friendly message and re-enable the button.
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
