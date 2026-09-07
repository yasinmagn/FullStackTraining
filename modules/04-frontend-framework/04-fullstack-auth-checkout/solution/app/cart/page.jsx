// Client Component: it reads cart state and has clickable buttons.
"use client";
import Link from "next/link";
import { useCart } from "../../components/CartContext";

export default function CartPage() {
  // useCart() pulls the shared cart out of CartContext — no props needed.
  const { items, setQuantity, removeItem, total } = useCart();

  // If there's nothing in the cart, show a friendly empty state instead.
  if (items.length === 0) {
    return (
      <div className="max-w-lg mx-auto text-center py-16">
        <div className="text-5xl mb-4">🛒</div>
        <h1 className="text-xl font-bold mb-1">Your cart is empty</h1>
        <p className="text-muted mb-5">Add a few things from the market to get started.</p>
        <Link href="/products" className="inline-block rounded-full bg-brand text-white px-6 py-2.5 font-medium hover:bg-brand-deep transition-colors">
          Browse products
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-4">Your cart</h1>
      <ul className="space-y-3">
        {/* Show one row per cart item, with quantity +/- and remove controls. */}
        {items.map((i) => (
          <li key={i.id} className="bg-white rounded-xl border border-line p-4 shadow-card flex justify-between items-center gap-3">
            <div className="min-w-0">
              <p className="font-medium truncate">{i.name}</p>
              <p className="text-sm text-muted">${i.price} each</p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button onClick={() => setQuantity(i.id, i.quantity - 1)} className="w-8 h-8 rounded-lg border border-line hover:bg-sand">−</button>
              <span className="w-8 text-center font-medium">{i.quantity}</span>
              <button onClick={() => setQuantity(i.id, i.quantity + 1)} className="w-8 h-8 rounded-lg border border-line hover:bg-sand">+</button>
              <button onClick={() => removeItem(i.id)} className="text-red-600 text-sm ml-1 hover:underline">Remove</button>
            </div>
          </li>
        ))}
      </ul>
      <div className="flex justify-between items-center mt-6 bg-white rounded-xl border border-line p-4">
        <p className="text-muted">Total</p>
        <p className="font-display text-2xl font-extrabold text-gold-deep">${total}</p>
      </div>
      <Link
        href="/checkout"
        className="mt-4 block text-center rounded-full bg-brand text-white px-5 py-3 font-medium hover:bg-brand-deep transition-colors"
      >
        Proceed to checkout
      </Link>
    </div>
  );
}
