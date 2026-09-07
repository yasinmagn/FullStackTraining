import Link from "next/link";
import ProductCard from "../components/ProductCard";
import { API } from "../lib/api";

// A Server Component: it's `async` and fetches data ON THE SERVER before sending
// finished HTML to the browser. No "use client", no useEffect — just await fetch.
export default async function HomePage() {
  let featured = [];
  try {
    // cache: "no-store" -> always fetch fresh data (don't cache the response).
    const res = await fetch(`${API}/products`, { cache: "no-store" });
    featured = (await res.json()).slice(0, 8); // show up to 8 featured products
  } catch { /* API down — hero still renders */ }

  return (
    <div>
      <section className="relative overflow-hidden rounded-2xl bg-brand-deep text-white px-6 sm:px-12 py-14 sm:py-20 mb-12">
        <span
          aria-hidden
          className="pointer-events-none select-none absolute -right-4 -top-10 sm:top-1/2 sm:-translate-y-1/2 font-display font-bold text-white/[0.06] leading-none text-[9rem] sm:text-[16rem]"
        >
          سوق
        </span>
        <div className="relative max-w-xl">
          <h1 className="font-display text-3xl sm:text-5xl font-extrabold leading-[1.05]">
            The market of Somaliland, now online.
          </h1>
          <p className="mt-4 text-white/75 text-base sm:text-lg max-w-md">
            Phones, laptops, audio and accessories from trusted sellers — delivered across Hargeisa.
          </p>
          <div className="mt-7">
            <Link
              href="/products"
              className="inline-flex items-center rounded-full bg-gold text-ink font-semibold px-6 py-3 hover:bg-gold-deep hover:text-white transition-colors"
            >
              Browse the market
            </Link>
          </div>
        </div>
      </section>

      <div className="flex items-end justify-between mb-5">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold">Featured products</h2>
          <p className="text-sm text-muted">Handpicked from across the catalog.</p>
        </div>
        <Link href="/products" className="text-brand text-sm font-medium hover:underline shrink-0">
          View all
        </Link>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Loop over the fetched products, rendering a card for each. */}
        {featured.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </div>
  );
}
