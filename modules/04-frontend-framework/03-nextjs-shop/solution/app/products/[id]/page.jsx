// This file lives in a folder named [id] — the square brackets make it a
// DYNAMIC ROUTE. A URL like /products/42 matches, and "42" becomes params.id.
// One page.jsx here can render the detail page for ANY product id.
import AddToCartButton from "../../../components/AddToCartButton";
import { API } from "../../../lib/api";

// Next.js passes "params" to the page, holding the dynamic segment(s).
// Here params.id is the id from the URL. This is an async Server Component,
// so it fetches that single product's data on the server.
export default async function ProductDetail({ params }) {
  const res = await fetch(`${API}/products/${params.id}`, { cache: "no-store" });
  // If the product doesn't exist (bad id), show a simple fallback message.
  if (!res.ok) return <p>Product not found.</p>;
  const p = await res.json();

  return (
    <div className="max-w-md bg-white rounded-lg p-6 shadow">
      <h1 className="text-2xl font-bold">{p.name}</h1>
      <p className="text-gray-500">{p.category?.name}</p>
      <p className="text-emerald-700 text-2xl font-bold my-2">${p.price}</p>
      {/* The className changes color based on stock (green vs red). */}
      <p className={p.stock > 0 ? "text-green-700" : "text-red-600"}>
        {/* Show a stock count or an "Out of stock" message. */}
        {p.stock > 0 ? `${p.stock} in stock` : "Out of stock"}
      </p>
      {/* Pass this product to the client-side Add-to-Cart button. */}
      <AddToCartButton product={p} />
    </div>
  );
}
