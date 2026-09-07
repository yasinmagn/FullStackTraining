// Client Component: the cart uses React state and lives in the browser.
"use client";
import { createContext, useContext, useState } from "react";

// Shared Context for the shopping cart. Any component (Navbar badge, cart page,
// checkout) can read/update the same cart via useCart() — no prop-drilling.
const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [items, setItems] = useState([]); // the cart: a list of { ...product, quantity }

  // Add a product: if it's already in the cart, bump its quantity; else add it.
  function addItem(product) {
    setItems((prev) => {
      const found = prev.find((i) => i.id === product.id);
      return found
        ? prev.map((i) => (i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i))
        : [...prev, { ...product, quantity: 1 }];
    });
  }

  // Remove a product entirely from the cart.
  function removeItem(id) {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  // Change an item's quantity; a quantity of 0 or less just removes it.
  function setQuantity(id, quantity) {
    if (quantity <= 0) return removeItem(id);
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, quantity } : i)));
  }

  // Empty the cart (used after a successful checkout).
  function clear() { setItems([]); }

  // Running total price, recalculated on every render from the items.
  const total = items.reduce((s, i) => s + Number(i.price) * i.quantity, 0);

  // Expose the cart data and actions to the rest of the app.
  return (
    <CartContext.Provider value={{ items, addItem, removeItem, setQuantity, clear, total }}>
      {children}
    </CartContext.Provider>
  );
}
// Shortcut hook so components can call useCart() to reach the cart.
export const useCart = () => useContext(CartContext);
