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
      <h1 className="text-2xl font-bold mb-4">Products</h1>
      <SearchBox />
      {products.length === 0 && <p className="text-gray-500">No products found.</p>}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </div>
  );
}
