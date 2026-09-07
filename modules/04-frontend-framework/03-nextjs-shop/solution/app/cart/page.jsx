// "use client" — the cart page is interactive (buttons change quantities,
// remove items) and reads live cart state via useCart(), so it's a Client
// Component. It runs in the browser, unlike the server pages we saw.
"use client";
import Link from "next/link";
import { useCart } from "../../components/CartContext";

// page.jsx for the "/cart" route.
export default function CartPage() {
  // Pull the cart data and actions from the shared context.
  const { items, setQuantity, removeItem, total } = useCart();

  // Early return: if the cart is empty, show a friendly message instead of
  // the item list. Returning early keeps the main JSX below simpler.
  if (items.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="mb-3">Your cart is empty.</p>
        <Link href="/products" className="text-emerald-700 underline">Browse products</Link>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-4">Your Cart</h1>
      <ul className="space-y-3">
        {/* Render one row per cart item; key is required for list items. */}
        {items.map((i) => (
          <li key={i.id} className="bg-white rounded-lg p-4 shadow flex justify-between items-center">
            <div>
              <p className="font-semibold">{i.name}</p>
              <p className="text-sm text-gray-500">${i.price} each</p>
            </div>
            <div className="flex items-center gap-2">
              {/* onClick handlers call context actions to update the cart. */}
              {/* Lowering quantity to 0 removes the item (see CartContext). */}
              <button onClick={() => setQuantity(i.id, i.quantity - 1)} className="border rounded px-2">−</button>
              <span>{i.quantity}</span>
              <button onClick={() => setQuantity(i.id, i.quantity + 1)} className="border rounded px-2">+</button>
              <button onClick={() => removeItem(i.id)} className="text-red-600 ml-2">Remove</button>
            </div>
          </li>
        ))}
      </ul>
      <div className="flex justify-between items-center mt-6">
        {/* "total" is computed in CartContext and updates automatically. */}
        <p className="text-xl font-bold">Total: ${total}</p>
        <Link href="/checkout" className="bg-emerald-700 text-white px-5 py-2 rounded-md">Checkout</Link>
      </div>
    </div>
  );
}
