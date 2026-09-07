"use client";
import { useCart } from "./CartContext";

export default function AddToCartButton({ product }) {
  const { addItem } = useCart();
  const out = product.stock === 0;
  return (
    <button onClick={() => addItem(product)} disabled={out}
            className="mt-2 bg-emerald-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-md w-full">
      {out ? "Out of stock" : "Add to Cart"}
    </button>
  );
}
