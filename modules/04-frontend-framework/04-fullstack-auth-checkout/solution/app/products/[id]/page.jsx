import Link from "next/link";
import AddToCartButton from "../../../components/AddToCartButton";
import { API } from "../../../lib/api";

// This lives in the folder "[id]", a DYNAMIC ROUTE. Visiting /products/42 makes
// Next.js pass params.id = "42" here. It's a Server Component, so it fetches the
// one product on the server before rendering.
export default async function ProductDetail({ params }) {
  const res = await fetch(`${API}/products/${params.id}`, { cache: "no-store" });
  // If the product doesn't exist, show a simple message instead of crashing.
  if (!res.ok) return <p>Product not found.</p>;
  const p = await res.json();

  return (
    <div className="max-w-4xl mx-auto">
      <Link href="/products" className="text-brand text-sm hover:underline">← Back to products</Link>
      <div className="grid md:grid-cols-2 gap-6 mt-3 bg-white rounded-2xl p-4 sm:p-6 shadow-sm">
        <div className="aspect-[3/2] rounded-xl overflow-hidden bg-gray-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={p.imageUrl || "/product-images/placeholder.svg"}
            alt={p.name}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="flex flex-col">
          <p className="text-sm text-muted capitalize">{p.category?.name}</p>
          <h1 className="text-2xl sm:text-3xl font-bold mt-1">{p.name}</h1>
          <p className="font-display text-gold-deep text-3xl font-extrabold my-3">${p.price}</p>
          <p className={`inline-flex w-fit items-center gap-1.5 text-sm font-medium px-2.5 py-1 rounded-full ${p.stock > 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
            <span className={`w-2 h-2 rounded-full ${p.stock > 0 ? "bg-green-600" : "bg-red-500"}`} />
            {p.stock > 0 ? `${p.stock} in stock` : "Out of stock"}
          </p>
          <div className="mt-auto pt-6 max-w-xs">
            {/* AddToCartButton is a Client Component so its onClick can run in
                the browser, even though this page is a Server Component. */}
            <AddToCartButton product={p} />
          </div>
        </div>
      </div>
    </div>
  );
}
