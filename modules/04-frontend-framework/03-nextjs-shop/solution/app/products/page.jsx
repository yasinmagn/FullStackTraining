// This is the page.jsx for the "/products" route. It's an async Server
// Component, so it fetches the product list on the server before rendering.
import Link from "next/link";
import AddToCartButton from "../../components/AddToCartButton";
import SearchBox from "../../components/SearchBox";
import { API } from "../../lib/api";

// Next.js passes "searchParams" (the URL query string, e.g. ?search=shoes)
// into page components automatically — no hook needed on the server.
export default async function ProductsPage({ searchParams }) {
  // Build the query string we'll send to the API from the URL's search params.
  const query = new URLSearchParams();
  if (searchParams?.search) query.set("search", searchParams.search);
  if (searchParams?.category) query.set("category", searchParams.category);

  // Fetch matching products on the server. While this awaits, Next.js shows
  // loading.jsx; if it throws, Next.js shows error.jsx.
  const res = await fetch(`${API}/products?${query}`, { cache: "no-store" });
  const products = await res.json();

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Products</h1>
      {/* SearchBox is a client component (it uses URL/state hooks) embedded */}
      {/* inside this server page — mixing server and client is normal in Next. */}
      <SearchBox />
      {/* Show a message only when there are no results (&& short-circuits). */}
      {products.length === 0 && <p>No products found.</p>}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Render one card per product; key helps React track list items. */}
        {products.map((p) => (
          <div key={p.id} className="bg-white rounded-lg p-4 shadow hover:shadow-md">
            {/* The id in the URL becomes the [id] param on the detail page. */}
            <Link href={`/products/${p.id}`} className="font-semibold hover:underline">{p.name}</Link>
            {/* Optional chaining (?.) safely reads category.name even if */}
            {/* category is missing, avoiding a crash. */}
            <p className="text-sm text-gray-500">{p.category?.name}</p>
            <p className="text-emerald-700 font-bold">${p.price}</p>
            <AddToCartButton product={p} />
          </div>
        ))}
      </div>
    </div>
  );
}
