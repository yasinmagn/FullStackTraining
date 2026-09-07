// The cart's state transitions live in one pure function.
// A reducer takes (currentState, action) and returns the NEXT state — never mutating
// the old one. Every branch returns a brand-new object/array (spread, map, filter).

// The starting state before any actions run.
export const initialCart = { items: [] };

// A reducer MUST be a PURE function: same inputs always give the same output,
// with no side-effects (no fetch, no logging that matters, no mutating arguments).
// It reads `state` and `action` and RETURNS a brand-new state object.
// `action.type` is a string label; the switch picks the matching update.
export function cartReducer(state, action) {
  switch (action.type) {
    case "ADD": {
      const found = state.items.find((i) => i.id === action.product.id);
      // map/spread build a NEW array — we never push into or edit the old one.
      const items = found
        ? state.items.map((i) =>
            i.id === action.product.id ? { ...i, quantity: i.quantity + 1 } : i
          )
        : [...state.items, { ...action.product, quantity: 1 }];
      // { ...state, items } copies the old state and swaps in the new items array.
      return { ...state, items };
    }

    case "SET_QUANTITY": {
      // Setting quantity to zero (or below) means remove the item entirely.
      if (action.quantity <= 0) {
        return { ...state, items: state.items.filter((i) => i.id !== action.id) };
      }
      return {
        ...state,
        items: state.items.map((i) =>
          i.id === action.id ? { ...i, quantity: action.quantity } : i
        ),
      };
    }

    case "REMOVE":
      // filter returns a NEW array without the matching item (no mutation).
      return { ...state, items: state.items.filter((i) => i.id !== action.id) };

    case "CLEAR":
      return { ...state, items: [] };

    // Always handle the "unknown action" case by returning state unchanged.
    default:
      return state;
  }
}
