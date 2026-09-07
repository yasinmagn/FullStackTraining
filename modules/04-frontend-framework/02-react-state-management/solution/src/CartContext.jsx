// Context lets any component read and update the cart WITHOUT prop drilling.
// We keep the cart state in a useReducer and expose friendly action helpers +
// derived values (count, total) through the provider's value.
import { createContext, useContext, useReducer } from "react";
import { cartReducer, initialCart } from "./cartReducer";

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [state, dispatch] = useReducer(cartReducer, initialCart);

  // Action helpers — components call these instead of dispatching raw actions.
  const addItem = (product) => dispatch({ type: "ADD", product });
  const removeItem = (id) => dispatch({ type: "REMOVE", id });
  const setQuantity = (id, quantity) => dispatch({ type: "SET_QUANTITY", id, quantity });
  const clear = () => dispatch({ type: "CLEAR" });

  // Derived state — computed from items, never stored separately.
  const items = state.items;
  const count = items.reduce((sum, i) => sum + i.quantity, 0);
  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  const value = { items, count, total, addItem, removeItem, setQuantity, clear };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

// Custom hook: gives components a clean `useCart()` and guards against misuse.
export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside a <CartProvider>");
  return ctx;
}
