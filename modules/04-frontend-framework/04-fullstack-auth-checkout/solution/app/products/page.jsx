import ProductCard from "../../components/ProductCard";
import SearchBox from "../../components/SearchBox";
import { API } from "../../lib/api";

// Server Component (no "use client"): it fetches the product list on the server.
// Next.js passes the URL's query string in as "searchParams" (e.g. ?search=phone).
export default async function ProductsPage({ searchParams }) {
  // Build the query string to forward the search/category filters to the API.
  const query = new URLSearchParams();
  if (searchParams?.search) query.set("search", searchParams.search);
  if (searchParams?.category) query.set("category", searchParams.category);

  // Fetch fresh results every time (no-store). While this awaits, Next.js shows
  // loading.jsx; if it throws, Next.js shows error.jsx.
  const res = await fetch(`${API}/products?${query}`, { cache: "no-store" });
  const products = await res.json();

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-2xl font-bold">Products</h1>
        <p className="text-sm text-muted">{products.length} item{products.length === 1 ? "" : "s"} in the market</p>
      </div>
      {/* SearchBox is a Client Component (it needs interactivity), embedded here
          inside a Server Component — mixing the two is normal in Next.js. */}
      <SearchBox />
      {products.length === 0 && <p className="text-muted">No products found. Try a different search.</p>}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Render a ProductCard for each product. */}
        {products.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </div>
  );
}
