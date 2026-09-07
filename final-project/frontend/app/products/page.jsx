import ProductCard from "../../components/ProductCard";
import SearchBox from "../../components/SearchBox";
import { API } from "../../lib/api";

export default async function ProductsPage({ searchParams }) {
  const query = new URLSearchParams();
  if (searchParams?.search) query.set("search", searchParams.search);
  if (searchParams?.category) query.set("category", searchParams.category);

  const res = await fetch(`${API}/products?${query}`, { cache: "no-store" });
  const products = await res.json();

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-2xl font-bold">Products</h1>
        <p className="text-sm text-muted">{products.length} item{products.length === 1 ? "" : "s"} in the market</p>
      </div>
      <SearchBox />
      {products.length === 0 && <p className="text-muted">No products found. Try a different search.</p>}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </div>
  );
}
