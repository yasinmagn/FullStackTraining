// "use client" is required: this button has an onClick handler and uses a hook,
// both of which only work in the browser (Client Component).
"use client";
import { useCart } from "./CartContext";

export default function AddToCartButton({ product }) {
  const { addItem } = useCart();     // grab the cart's addItem from context
  const out = product.stock === 0;   // out of stock?
  return (
    <button
      onClick={() => addItem(product)}
      disabled={out}
      className="mt-2 w-full rounded-lg bg-brand hover:bg-brand-deep disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-2.5 transition-colors"
    >
      {out ? "Sold out" : "Add to cart"}
    </button>
  );
}
