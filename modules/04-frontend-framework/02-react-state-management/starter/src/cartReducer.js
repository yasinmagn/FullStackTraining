// A reducer is a PURE function: (currentState, action) => nextState.
// It must NEVER mutate the old state — always return new objects/arrays
// with spread (...), map, and filter.

export const initialCart = { items: [] };

export function cartReducer(state, action) {
  switch (action.type) {
    // TODO 1: case "ADD" — action has { product }.
    //   If the product is already in state.items, map to quantity + 1.
    //   Otherwise append { ...action.product, quantity: 1 }.
    //   Return { ...state, items } — never push/mutate.

    // TODO 2: case "SET_QUANTITY" — action has { id, quantity }.
    //   If quantity <= 0, remove the item (filter it out).
    //   Otherwise map the matching item to the new quantity.

    // TODO 3: case "REMOVE" — action has { id }. Filter that item out.

    // TODO 4: case "CLEAR" — return state with an empty items array.

    default:
      return state;
  }
}
