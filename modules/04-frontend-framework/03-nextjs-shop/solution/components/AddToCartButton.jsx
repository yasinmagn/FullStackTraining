// "use client" — this button has an onClick handler (a browser event) and uses
// a hook (useCart). Interactivity like this only works in Client Components.
// Server Components can't use onClick or hooks.
"use client";
import { useCart } from "./CartContext";

// Receives a "product" via props and adds it to the cart when clicked.
export default function AddToCartButton({ product }) {
  // Pull the addItem function out of the shared cart context.
  const { addItem } = useCart();
  // Disable the button when the product is sold out.
  const out = product.stock === 0;
  return (
    <button onClick={() => addItem(product)} disabled={out}
            className="mt-2 bg-emerald-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-md w-full">
      {/* Show different label depending on stock */}
      {out ? "Out of stock" : "Add to Cart"}
    </button>
  );
}
