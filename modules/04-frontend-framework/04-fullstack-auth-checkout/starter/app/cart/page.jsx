"use client";
import Link from "next/link";
import { useCart } from "../../components/CartContext";

export default function CartPage() {
  const { items, setQuantity, removeItem, total } = useCart();

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
        {items.map((i) => (
          <li key={i.id} className="bg-white rounded-lg p-4 shadow flex justify-between items-center">
            <div>
              <p className="font-semibold">{i.name}</p>
              <p className="text-sm text-gray-500">${i.price} each</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setQuantity(i.id, i.quantity - 1)} className="border rounded px-2">−</button>
              <span>{i.quantity}</span>
              <button onClick={() => setQuantity(i.id, i.quantity + 1)} className="border rounded px-2">+</button>
              <button onClick={() => removeItem(i.id)} className="text-red-600 ml-2">Remove</button>
            </div>
          </li>
        ))}
      </ul>
      <div className="flex justify-between items-center mt-6">
        <p className="text-xl font-bold">Total: ${total}</p>
        <Link href="/checkout" className="bg-emerald-700 text-white px-5 py-2 rounded-md">Checkout</Link>
      </div>
    </div>
  );
}
