import AddToCartButton from "../../../components/AddToCartButton";
import { API } from "../../../lib/api";

export default async function ProductDetail({ params }) {
  const res = await fetch(`${API}/products/${params.id}`, { cache: "no-store" });
  if (!res.ok) return <p>Product not found.</p>;
  const p = await res.json();

  return (
    <div className="max-w-md bg-white rounded-lg p-6 shadow">
      <h1 className="text-2xl font-bold">{p.name}</h1>
      <p className="text-gray-500">{p.category?.name}</p>
      <p className="text-emerald-700 text-2xl font-bold my-2">${p.price}</p>
      <p className={p.stock > 0 ? "text-green-700" : "text-red-600"}>
        {p.stock > 0 ? `${p.stock} in stock` : "Out of stock"}
      </p>
      <AddToCartButton product={p} />
    </div>
  );
}
