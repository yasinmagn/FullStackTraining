import Link from "next/link";
import AddToCartButton from "../../components/AddToCartButton";
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
      {products.length === 0 && <p>No products found.</p>}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {products.map((p) => (
          <div key={p.id} className="bg-white rounded-lg p-4 shadow hover:shadow-md">
            <Link href={`/products/${p.id}`} className="font-semibold hover:underline">{p.name}</Link>
            <p className="text-sm text-gray-500">{p.category?.name}</p>
            <p className="text-emerald-700 font-bold">${p.price}</p>
            <AddToCartButton product={p} />
          </div>
        ))}
      </div>
    </div>
  );
}
