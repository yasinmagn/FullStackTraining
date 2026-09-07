// Context lets any component read and update the cart WITHOUT prop drilling.
// Fill in the provider so it holds the cart in a useReducer and exposes
// action helpers + derived values (count, total).
import { createContext, useContext, useReducer } from "react";
import { cartReducer, initialCart } from "./cartReducer";

const CartContext = createContext(null);

export function CartProvider({ children }) {
  // TODO 5: create the reducer state:
  //   const [state, dispatch] = useReducer(cartReducer, initialCart);

  // TODO 6: write the action helpers that dispatch the right action objects:
  //   addItem(product)          -> dispatch({ type: "ADD", product })
  //   removeItem(id)            -> dispatch({ type: "REMOVE", id })
  //   setQuantity(id, quantity) -> dispatch({ type: "SET_QUANTITY", id, quantity })
  //   clear()                   -> dispatch({ type: "CLEAR" })

  // TODO 7: derive count (sum of quantities) and total (sum of price*quantity)
  //   from state.items with reduce.

  // TODO 8: provide { items, count, total, addItem, removeItem, setQuantity, clear }
  //   through the CartContext.Provider value.
  return <CartContext.Provider value={null}>{children}</CartContext.Provider>;
}

// TODO 9: custom hook — read the context with useContext, throw a helpful error
// if it's null (used outside a provider), otherwise return it.
export function useCart() {
}
