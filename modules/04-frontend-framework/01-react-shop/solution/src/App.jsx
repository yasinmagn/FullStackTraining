import { useState, useEffect } from "react";
import ProductCard from "./components/ProductCard";

const API = "http://localhost:3000";

export default function App() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Refetch whenever the search term changes.
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
  function addToCart(product) {
    setCart((prev) => {
      const found = prev.find((i) => i.id === product.id);
      return found
        ? prev.map((i) => (i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i))
        : [...prev, { ...product, quantity: 1 }];
    });
  }

  function removeFromCart(id) {
    setCart((prev) => prev.filter((i) => i.id !== id));
  }

  const total = cart.reduce((sum, i) => sum + Number(i.price) * i.quantity, 0);

  return (
    <div>
      <header style={{ display: "flex", justifyContent: "space-between", padding: 16, background: "var(--brand)", color: "white" }}>
        <h1>SooqOnline</h1>
        <span>Cart: {cart.length} items — ${total}</span>
      </header>

      <input value={search} onChange={(e) => setSearch(e.target.value)}
             placeholder="Search products..." style={{ margin: 16, padding: 10 }} />

      {error && <p style={{ color: "red", padding: 16 }}>{error}</p>}
      {loading ? <p style={{ padding: 16 }}>Loading…</p> : (
        <div className="product-grid">
          {products.map((p) => <ProductCard key={p.id} product={p} onAdd={addToCart} />)}
        </div>
      )}

      <section style={{ padding: 24 }}>
        <h2>Your Cart</h2>
        {cart.length === 0 ? (
          <p>Your cart is empty.</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0 }}>
            {cart.map((i) => (
              <li key={i.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", maxWidth: 400 }}>
                <span>{i.name} × {i.quantity}</span>
                <button onClick={() => removeFromCart(i.id)}>Remove</button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
