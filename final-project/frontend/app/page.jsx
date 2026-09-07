import Link from "next/link";
import ProductCard from "../components/ProductCard";
import { API } from "../lib/api";

export default async function HomePage() {
  let featured = [];
  try {
    const res = await fetch(`${API}/products`, { cache: "no-store" });
    featured = (await res.json()).slice(0, 8);
  } catch { /* API down — hero still renders */ }

  return (
    <div>
      <section className="relative overflow-hidden bg-gradient-to-br from-emerald-700 to-emerald-500 text-white rounded-2xl p-10 sm:p-14 text-center mb-10 shadow-sm">
        <h1 className="text-3xl sm:text-4xl font-extrabold mb-3 tracking-tight">Welcome to SooqOnline</h1>
        <p className="mb-6 text-emerald-50 max-w-xl mx-auto">
          Quality phones, computers, audio and accessories — delivered across Somaliland.
        </p>
        <Link
          href="/products"
          className="inline-block bg-white text-emerald-700 px-6 py-2.5 rounded-full font-semibold hover:bg-emerald-50 transition-colors"
        >
          Browse Products
        </Link>
      </section>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Featured</h2>
        <Link href="/products" className="text-emerald-700 text-sm font-medium hover:underline">
          View all →
        </Link>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {featured.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </div>
  );
}
