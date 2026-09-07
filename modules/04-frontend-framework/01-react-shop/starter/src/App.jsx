import { useState, useEffect } from "react";
import ProductCard from "./components/ProductCard";

const API = "http://localhost:3000";

export default function App() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // TODO 2: useEffect depending on [search] — fetch `${API}/products?search=${search}`,
  // setProducts + setLoading(false). On fetch failure setError("API not reachable — is your server running?").
  useEffect(() => {
  }, [search]);

  // TODO 3: addToCart(product) — REPLACE state, never mutate:
  // if already in cart, map to quantity+1; else spread in { ...product, quantity: 1 }.
  function addToCart(product) {
  }

  // TODO 4: removeFromCart(id) with .filter
  function removeFromCart(id) {
  }

  // TODO 5: total via reduce
  const total = 0;

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
        {/* TODO 6: list cart items with name, quantity, and a Remove button */}
      </section>
    </div>
  );
}

// Stretch: category filter buttons that refetch with ?category=...
