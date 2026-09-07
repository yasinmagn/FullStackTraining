// Context lets any component read and update the cart WITHOUT prop drilling.
// We keep the cart state in a useReducer and expose friendly action helpers +
// derived values (count, total) through the provider's value.
// createContext creates the shared "channel". useContext reads from it.
// useReducer manages complex state via a reducer function (see cartReducer.js).
import { createContext, useContext, useReducer } from "react";
import { cartReducer, initialCart } from "./cartReducer";

// The context object. `null` is the default value used if no Provider is above a consumer.
const CartContext = createContext(null);

// A Provider is a component that supplies a value to everything rendered inside it.
// `children` is a special prop holding whatever JSX is nested between its tags.
export function CartProvider({ children }) {
  // useReducer returns [currentState, dispatch]. We call dispatch(action) to request
  // a change; React then runs cartReducer(state, action) to compute the next state.
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

  // Bundle state + actions into one object; this is what useCart() will return.
  const value = { items, count, total, addItem, removeItem, setQuantity, clear };

  // The Provider shares `value` with every child in the tree via context.
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

// Custom hook: gives components a clean `useCart()` and guards against misuse.
export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside a <CartProvider>");
  return ctx;
}
