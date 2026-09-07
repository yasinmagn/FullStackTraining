// "use client" is required because this file uses React hooks (useState,
// useContext) and holds interactive state — those only work in Client Components.
"use client";
import { createContext, useContext, useState } from "react";

// React Context lets us share data (the cart) with any component in the tree
// WITHOUT passing props down manually through every level ("prop drilling").
// We create the context here with a default value of null.
const CartContext = createContext(null);

// CartProvider wraps our app (see layout.jsx) and supplies the cart data.
// Any component rendered inside it can read/update the cart via useCart().
export function CartProvider({ children }) {
  // useState holds the list of cart items. Calling setItems re-renders any
  // component that uses this cart, so the UI stays in sync automatically.
  const [items, setItems] = useState([]);

  // Add a product to the cart. If it's already there, bump its quantity by 1;
  // otherwise add it as a new line with quantity 1.
  // Note: we always create NEW objects/arrays (with ...spread) instead of
  // mutating the old ones, because React only re-renders when state changes
  // reference.
  function addItem(product) {
    setItems((prev) => {
      const found = prev.find((i) => i.id === product.id);
      return found
        ? prev.map((i) => (i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i))
        : [...prev, { ...product, quantity: 1 }];
    });
  }

  // Remove an item completely by filtering it out of the list.
  function removeItem(id) {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  // Change an item's quantity. If it drops to 0 or below, remove it instead.
  function setQuantity(id, quantity) {
    if (quantity <= 0) return removeItem(id);
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, quantity } : i)));
  }

  // Empty the whole cart.
  function clear() { setItems([]); }

  // Derived value: the cart total. We recompute it on every render from items,
  // so it's always up to date (no separate state needed).
  const total = items.reduce((s, i) => s + Number(i.price) * i.quantity, 0);

  // The Provider makes everything in "value" available to child components.
  // {children} is whatever gets wrapped by <CartProvider> in layout.jsx.
  return (
    <CartContext.Provider value={{ items, addItem, removeItem, setQuantity, clear, total }}>
      {children}
    </CartContext.Provider>
  );
}
// Custom hook: a shortcut so components can call useCart() to read the cart
// instead of importing useContext + CartContext every time.
export const useCart = () => useContext(CartContext);
