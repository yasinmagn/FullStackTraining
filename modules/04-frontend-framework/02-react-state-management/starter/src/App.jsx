import { CartProvider, useCart } from "./CartContext";
import ProductCard from "./components/ProductCard";
import Cart from "./components/Cart";
import { products } from "./data/products";

// Header reads the cart straight from context — no props passed down from App.
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
      {products.map((p) => (
        <ProductCard key={p.id} product={p} onAdd={addItem} />
      ))}
    </div>
  );
}

// App just composes the tree. Because everything reads the cart from context,
// App does NOT hold cart state or thread it through props (no prop drilling).
export default function App() {
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
