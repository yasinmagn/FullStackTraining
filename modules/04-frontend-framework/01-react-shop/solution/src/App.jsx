// useState lets a component remember values between renders (its "state").
// useEffect runs side-effects (like fetching data) after the component renders.
import { useState, useEffect } from "react";
import ProductCard from "./components/ProductCard";

const API = "http://localhost:3000";

// A component is a function that returns UI (JSX). React re-runs it whenever its state changes.
export default function App() {
  // Each useState returns [currentValue, setter]. Calling the setter updates state
  // and tells React to re-render this component with the new value.
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Refetch whenever the search term changes.
  // The array at the end ([search]) is the "dependency list": useEffect re-runs
  // only when a value in it changes. An empty [] would run just once on mount.
  useEffect(() => {
    setLoading(true);
    setError("");
    fetch(`${API}/products?search=${search}`)
      .then((res) => res.json())
      .then((data) => {
        setProducts(data);
        setLoading(false);
      })
      .catch(() => {
        setError("API not reachable — is your server running?");
        setLoading(false);
      });
  }, [search]);

  // Immutable add: return a NEW array so React re-renders.
  // Never modify (mutate) the old array directly — React compares references to
  // decide if it should re-render, so we build a fresh array with map/spread.
  function addToCart(product) {
    // Passing a function to the setter gives us the latest state as `prev`.
    setCart((prev) => {
      const found = prev.find((i) => i.id === product.id);
      return found
        ? prev.map((i) => (i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i))
        : [...prev, { ...product, quantity: 1 }];
    });
  }

  // filter returns a NEW array without the removed item (no mutation).
  function removeFromCart(id) {
    setCart((prev) => prev.filter((i) => i.id !== id));
  }

  // Derived value: computed from state on every render, so we never store it separately.
  const total = cart.reduce((sum, i) => sum + Number(i.price) * i.quantity, 0);

  // Everything returned below is JSX: HTML-like syntax that describes the UI.
  // Curly braces {} let us drop JavaScript values into the markup.
  return (
    <div>
      <header style={{ display: "flex", justifyContent: "space-between", padding: 16, background: "var(--brand)", color: "white" }}>
        <h1>SooqOnline</h1>
        <span>Cart: {cart.length} items — ${total}</span>
      </header>

      {/* Controlled input: its value comes from state, and onChange updates that state on every keystroke. */}
      <input value={search} onChange={(e) => setSearch(e.target.value)}
             placeholder="Search products..." style={{ margin: 16, padding: 10 }} />

      {/* Conditional rendering: `error && <p>` shows the <p> only when error is truthy. */}
      {error && <p style={{ color: "red", padding: 16 }}>{error}</p>}
      {/* A ternary (condition ? a : b) picks between two things to render. */}
      {loading ? <p style={{ padding: 16 }}>Loading…</p> : (
        <div className="product-grid">
          {/* .map turns the products array into a list of <ProductCard> elements. */}
          {/* Each needs a unique `key` so React can track items efficiently across re-renders. */}
          {/* `product` and `onAdd` are props: data/functions we pass down to the child component. */}
          {products.map((p) => <ProductCard key={p.id} product={p} onAdd={addToCart} />)}
        </div>
      )}

      <section style={{ padding: 24 }}>
        <h2>Your Cart</h2>
        {cart.length === 0 ? (
          <p>Your cart is empty.</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0 }}>
            {/* Again .map renders one <li> per cart item, with a unique key. */}
            {cart.map((i) => (
              <li key={i.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", maxWidth: 400 }}>
                <span>{i.name} × {i.quantity}</span>
                {/* onClick wires a click to our handler; the arrow keeps it from firing during render. */}
                <button onClick={() => removeFromCart(i.id)}>Remove</button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
