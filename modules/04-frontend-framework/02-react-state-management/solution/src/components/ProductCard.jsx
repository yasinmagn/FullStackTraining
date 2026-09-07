export default function ProductCard({ product, onAdd }) {
  const out = product.stock === 0;
  return (
    <article className="product-card">
      <h3>{product.name}</h3>
      <p className="price">${product.price}</p>
      <button onClick={() => onAdd(product)} disabled={out}>
        {out ? "Out of stock" : "Add to Cart"}
      </button>
    </article>
  );
}
