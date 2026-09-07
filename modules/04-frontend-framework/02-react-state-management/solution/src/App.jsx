// CartProvider makes the cart available to the whole tree; useCart reads it.
import { CartProvider, useCart } from "./CartContext";
import ProductCard from "./components/ProductCard";
import Cart from "./components/Cart";
import { products } from "./data/products";

// Header reads the cart straight from context — no props passed down from App.
// useCart() is our custom hook that returns the shared cart data and actions.
function Header() {
  const { count, total } = useCart();
  return (
    <header>
      <h1>SooqOnline</h1>
      <span>Cart: {count} items — ${total}</span>
    </header>
  );
}

// Catalog only needs addItem — again, straight from context.
function Catalog() {
  const { addItem } = useCart();
  return (
    <div className="product-grid">
      {/* .map renders one ProductCard per product; `key` must be unique so React tracks each one. */}
      {products.map((p) => (
        <ProductCard key={p.id} product={p} onAdd={addItem} />
      ))}
    </div>
  );
}

// App just composes the tree. Because everything reads the cart from context,
// App does NOT hold cart state or thread it through props (no prop drilling).
export default function App() {
  // Everything inside <CartProvider> can call useCart() to reach the shared cart,
  // no matter how deeply nested it is. That is what Context solves: it avoids
  // passing props through every layer just to reach a far-away child.
  return (
    <CartProvider>
      <Header />
      <main>
        <Catalog />
        <Cart />
      </main>
    </CartProvider>
  );
}
