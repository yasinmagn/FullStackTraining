// Client component: the shopping cart lives in browser memory (React state).
// Note this cart is client-side only until checkout; refreshing the page resets it.
"use client";
import { createContext, useContext, useState } from "react";

const CartContext = createContext(null);

// CartProvider stores the cart items and exposes functions to change them.
export function CartProvider({ children }) {
  const [items, setItems] = useState([]);

  // Add a product: if it's already in the cart bump its quantity, else append it.
  // We always return a NEW array (immutable update) so React notices the change.
  function addItem(product) {
    setItems((prev) => {
      const found = prev.find((i) => i.id === product.id);
      return found
        ? prev.map((i) => (i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i))
        : [...prev, { ...product, quantity: 1 }];
    });
  }

  function removeItem(id) {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  // Set an exact quantity; hitting 0 removes the line entirely.
  function setQuantity(id, quantity) {
    if (quantity <= 0) return removeItem(id);
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, quantity } : i)));
  }

  function clear() { setItems([]); }

  // Derived value: recomputed on every render from items (no separate state needed).
  const total = items.reduce((s, i) => s + Number(i.price) * i.quantity, 0);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, setQuantity, clear, total }}>
      {children}
    </CartContext.Provider>
  );
}
// Hook used by the navbar, cart page and checkout to read/update the cart.
export const useCart = () => useContext(CartContext);
