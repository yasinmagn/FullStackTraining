// TODO 3: fetch `http://localhost:3000/products/${params.id}` (cache: "no-store").
// If !res.ok render "Product not found." Otherwise show name, price, stock status,
// and <AddToCartButton product={p} />.
export default async function ProductDetail({ params }) {
  return <p>TODO: product {params.id}</p>;
}
