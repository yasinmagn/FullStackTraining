// page.jsx is a SPECIAL Next.js file: it defines the UI for a route. This one
// sits at the app root, so it's the home page ("/").
import Link from "next/link";
import AddToCartButton from "../components/AddToCartButton";
import { API } from "../lib/api";

// Notice this function is "async" — a Server Component can be asynchronous and
// fetch data DIRECTLY on the server before sending HTML to the browser. No
// useEffect or loading spinner needed; the data is ready when the page renders.
export default async function HomePage() {
  let featured = [];
  try {
    // fetch runs on the server here. cache: "no-store" means always get fresh
    // data (don't cache) — useful for data that changes often.
    const res = await fetch(`${API}/products`, { cache: "no-store" });
    // Take just the first 4 products to feature on the home page.
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
        {/* Loop over the featured products and render a card for each. */}
        {/* React needs a unique "key" on list items to track them efficiently. */}
        {featured.map((p) => (
          <div key={p.id} className="bg-white rounded-lg p-4 shadow">
            {/* Link to the product's detail page using its id in the URL. */}
            <Link href={`/products/${p.id}`} className="font-semibold hover:underline">{p.name}</Link>
            <p className="text-emerald-700 font-bold">${p.price}</p>
            {/* This server page can still render a CLIENT component. We pass */}
            {/* the product down as a prop; the button handles the click. */}
            <AddToCartButton product={p} />
          </div>
        ))}
      </div>
    </div>
  );
}
