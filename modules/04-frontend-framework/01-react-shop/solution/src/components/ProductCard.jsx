// Props are the inputs a component receives from its parent.
// Here we destructure them: `product` (data) and `onAdd` (a callback function).
export default function ProductCard({ product, onAdd }) {
  const out = product.stock === 0;
  return (
    <article className="product-card">
      {/* {product.name} reads a prop and displays it inside the markup. */}
      <h3>{product.name}</h3>
      <p className="price">${product.price}</p>
      {/* Clicking calls the parent's onAdd with this product; `disabled` is set when out of stock. */}
      <button onClick={() => onAdd(product)} disabled={out}>
        {out ? "Out of stock" : "Add to Cart"}
      </button>
    </article>
  );
}
