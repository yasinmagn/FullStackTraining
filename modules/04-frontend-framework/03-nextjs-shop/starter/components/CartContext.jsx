"use client";
import { createContext, useContext, useState } from "react";

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);

  // TODO 5: addItem(product) — same immutable logic as Lab 12
  function addItem(product) {
  }
  // TODO 6: removeItem(id) and setQuantity(id, quantity) (0 removes)
  function removeItem(id) {}
  function setQuantity(id, quantity) {}

  const total = items.reduce((s, i) => s + Number(i.price) * i.quantity, 0);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, setQuantity, total }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
