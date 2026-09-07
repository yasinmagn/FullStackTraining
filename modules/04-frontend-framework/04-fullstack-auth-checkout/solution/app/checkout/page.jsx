// Client Component: needs the cart, the auth token, and a click handler.
"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "../../components/CartContext";
import { useAuth } from "../../components/AuthContext";
import { authedFetch } from "../../lib/api";

// Turn raw server error codes into friendly messages for the shopper.
const NICE_ERRORS = {
  INSUFFICIENT_STOCK: "Sorry, not enough stock for one of your items.",
  CART_EMPTY: "Your cart is empty.",
};

export default function CheckoutPage() {
  const { items, total, clear } = useCart();
  const { token } = useAuth();
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [placing, setPlacing] = useState(false); // true while the order is sending

  // Checkout requires an account, so bounce guests to the login page.
  useEffect(() => {
    if (!localStorage.getItem("token")) router.push("/login");
  }, [router]);

  async function placeOrder() {
    setPlacing(true);
    setMessage("");
    // Send the cart to the server to create an order. We only send the product
    // id and quantity — the server looks up the real price so a user can't
    // tamper with prices in the browser.
    //
    // WHY THIS MATTERS ON THE SERVER: creating an order must be a TRANSACTION —
    // an all-or-nothing operation. The server, in a single transaction, checks
    // stock, decrements it, and saves the order. If any step fails, EVERYTHING
    // is rolled back, so stock and orders never get out of sync. The stock
    // decrement is also ATOMIC, which prevents overselling: if two people try
    // to buy the last item at the same instant, only one succeeds.
    const res = await authedFetch("/orders", {
      method: "POST",
      body: JSON.stringify({
        items: items.map(({ id, quantity }) => ({ productId: id, quantity })),
      }),
    }, token);

    if (res.ok) {
      const order = await res.json();
      clear();                                  // empty the cart on success
      router.push(`/orders?placed=${order.id}`); // go show the new order
    } else {
      // e.g. the server refused because stock ran out (INSUFFICIENT_STOCK).
      const { error } = await res.json();
      setMessage(NICE_ERRORS[error] || error || "Something went wrong.");
      setPlacing(false);
    }
  }

  return (
    <div className="max-w-md mx-auto space-y-4">
      <h1 className="text-2xl font-bold">Checkout</h1>
      {/* Order summary: list every item, then the total. */}
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
      {/* Disable the button while placing (so the user can't double-submit) or
          when the cart is empty. */}
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
