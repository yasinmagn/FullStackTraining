import Link from "next/link";
import AddToCartButton from "../components/AddToCartButton";
import { API } from "../lib/api";

export default async function HomePage() {
  let featured = [];
  try {
    const res = await fetch(`${API}/products`, { cache: "no-store" });
    featured = (await res.json()).slice(0, 4);
  } catch { /* API down — hero still renders */ }

  return (
    <div>
      <section className="bg-emerald-700 text-white rounded-xl p-10 text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Welcome to SooqOnline</h1>
        <p className="mb-4">Quality products, delivered across Somaliland.</p>
        <Link href="/products" className="bg-white text-emerald-700 px-5 py-2 rounded-md font-semibold">
          Browse Products
        </Link>
      </section>
      <h2 className="text-xl font-bold mb-4">Featured</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {featured.map((p) => (
          <div key={p.id} className="bg-white rounded-lg p-4 shadow">
            <Link href={`/products/${p.id}`} className="font-semibold hover:underline">{p.name}</Link>
            <p className="text-emerald-700 font-bold">${p.price}</p>
            <AddToCartButton product={p} />
          </div>
        ))}
      </div>
    </div>
  );
}
