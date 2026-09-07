"use client";
import Link from "next/link";
import { useCart } from "./CartContext";

export default function CartBadge() {
  const { items } = useCart();
  return <Link href="/cart">Cart ({items.reduce((s, i) => s + i.quantity, 0)})</Link>;
}
