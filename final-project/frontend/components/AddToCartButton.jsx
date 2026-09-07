// Client component because it has an onClick handler and reads the cart context.
// It's kept tiny and separate so the surrounding ProductCard can stay a Server
// Component — only this interactive button ships JavaScript to the browser.
"use client";
import { useCart } from "./CartContext";

export default function AddToCartButton({ product }) {
  const { addItem } = useCart(); // grab the cart's addItem function
  const out = product.stock === 0;
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
