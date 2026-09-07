// "use client" — this component reads live cart state via useCart(), which
// relies on React context/hooks, so it must run on the client.
"use client";
import Link from "next/link";
import { useCart } from "./CartContext";

// Small badge in the header showing the total number of items in the cart.
export default function CartBadge() {
  // Read the cart from context. Because it's context, this badge re-renders
  // automatically whenever items change anywhere in the app.
  const { items } = useCart();
  // Link is Next.js's client-side navigation (faster than a plain <a> tag).
  // reduce() sums up every item's quantity to get the total count.
  return <Link href="/cart">Cart ({items.reduce((s, i) => s + i.quantity, 0)})</Link>;
}
