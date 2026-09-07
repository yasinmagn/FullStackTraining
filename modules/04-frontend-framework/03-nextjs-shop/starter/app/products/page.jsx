// SERVER component — no "use client", no useEffect. This is the Next.js way.
import AddToCartButton from "../../components/AddToCartButton";

export default async function ProductsPage() {
  const res = await fetch("http://localhost:3000/products", { cache: "no-store" });
  const products = await res.json();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
      {products.map((p) => (
        <div key={p.id} className="bg-white rounded-lg p-4 shadow hover:shadow-md">
          <a href={`/products/${p.id}`} className="font-semibold">{p.name}</a>
          <p className="text-emerald-700 font-bold">${p.price}</p>
          <AddToCartButton product={p} />
        </div>
      ))}
    </div>
  );
}
// TODO 2: add a client <SearchBox /> component above the grid that navigates to
// /products?search=... (useRouter) and read searchParams here to pass ?search to the API.
