"use client";
import { useCart } from "../../components/CartContext";

// TODO 4: render cart items (name, unit price, quantity with +/- buttons, remove),
// and the total. Empty cart -> friendly message + Link to /products.
export default function CartPage() {
  const { items } = useCart();
  return <h1 className="text-xl font-bold">Cart ({items.length}) — TODO</h1>;
}
