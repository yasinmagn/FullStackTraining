import { useCart } from "../CartContext";

// The Cart reads and mutates shared state through the context hook.
// Notice it never received a single prop — it talks to the CartProvider directly.
export default function Cart() {
  // Pull the shared cart data and action helpers out of context — no props needed.
  const { items, total, setQuantity, removeItem, clear } = useCart();

  // Early return: render an "empty" message and stop here when there are no items.
  if (items.length === 0) {
    return (
      <section className="cart">
        <h2>Your Cart</h2>
        <p>Your cart is empty.</p>
      </section>
    );
  }

  return (
    <section className="cart">
      <h2>Your Cart</h2>
      <ul>
        {/* .map renders one <li> per cart item; each needs a unique `key`. */}
        {items.map((i) => (
          <li key={i.id}>
            <span className="name">{i.name} — ${i.price}</span>
            <span className="qty">
              {/* Each button calls a context action, which dispatches to the reducer. */}
              <button onClick={() => setQuantity(i.id, i.quantity - 1)}>−</button>
              <b>{i.quantity}</b>
              <button onClick={() => setQuantity(i.id, i.quantity + 1)}>+</button>
            </span>
            <button className="remove" onClick={() => removeItem(i.id)}>Remove</button>
          </li>
        ))}
      </ul>
      <p className="total">Total: ${total}</p>
      <button className="clear" onClick={clear}>Clear cart</button>
    </section>
  );
}
