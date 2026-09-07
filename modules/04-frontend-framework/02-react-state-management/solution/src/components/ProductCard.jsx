// Props are the inputs a parent passes in: `product` (data) and `onAdd` (a callback).
export default function ProductCard({ product, onAdd }) {
  const out = product.stock === 0;
  return (
    <article className="product-card">
      {/* Curly braces {} insert a prop's value into the JSX. */}
      <h3>{product.name}</h3>
      <p className="price">${product.price}</p>
      {/* onClick calls the passed-in onAdd; `disabled` turns the button off when out of stock. */}
      <button onClick={() => onAdd(product)} disabled={out}>
        {out ? "Out of stock" : "Add to Cart"}
      </button>
    </article>
  );
}
