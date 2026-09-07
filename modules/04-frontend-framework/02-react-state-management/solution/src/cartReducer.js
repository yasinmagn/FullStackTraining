// The cart's state transitions live in one pure function.
// A reducer takes (currentState, action) and returns the NEXT state — never mutating
// the old one. Every branch returns a brand-new object/array (spread, map, filter).

export const initialCart = { items: [] };

export function cartReducer(state, action) {
  switch (action.type) {
    case "ADD": {
      const found = state.items.find((i) => i.id === action.product.id);
      const items = found
        ? state.items.map((i) =>
            i.id === action.product.id ? { ...i, quantity: i.quantity + 1 } : i
          )
        : [...state.items, { ...action.product, quantity: 1 }];
      return { ...state, items };
    }

    case "SET_QUANTITY": {
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
      return { ...state, items: state.items.filter((i) => i.id !== action.id) };

    case "CLEAR":
      return { ...state, items: [] };

    default:
      return state;
  }
}
