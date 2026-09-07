"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { API } from "../../lib/api";

function StatCard({ label, value, accent }) {
  return (
    <div className="bg-white rounded-xl p-5 shadow-card border border-line">
      <p className="text-sm text-muted">{label}</p>
      <p className={`font-display text-3xl font-extrabold mt-1 ${accent || "text-ink"}`}>{value}</p>
    </div>
  );
}

export default function AdminOverview() {
  const [products, setProducts] = useState(null);

  useEffect(() => {
    fetch(`${API}/products`)
      .then((r) => (r.ok ? r.json() : []))
      .then(setProducts)
      .catch(() => setProducts([]));
  }, []);

  if (!products) return <p className="text-gray-400 animate-pulse">Loading stats…</p>;

  const total = products.length;
  const outOfStock = products.filter((p) => p.stock === 0).length;
  const units = products.reduce((s, p) => s + p.stock, 0);
  const inventoryValue = products.reduce((s, p) => s + Number(p.price) * p.stock, 0);
  const categories = new Set(products.map((p) => p.category?.name).filter(Boolean)).size;
  const lowStock = products.filter((p) => p.stock > 0 && p.stock <= 3);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Overview</h2>
        <p className="text-sm text-gray-500">A snapshot of the SooqOnline catalog.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total products" value={total} accent="text-brand" />
        <StatCard label="Out of stock" value={outOfStock} accent={outOfStock ? "text-red-600" : "text-gray-800"} />
        <StatCard label="Units in stock" value={units} />
        <StatCard label="Inventory value" value={`$${inventoryValue.toLocaleString()}`} accent="text-brand" />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b">
            <h3 className="font-semibold text-gray-700">Low stock (≤ 3)</h3>
            <Link href="/admin/products" className="text-sm text-brand hover:underline">Manage products →</Link>
          </div>
          {lowStock.length === 0 ? (
            <p className="p-5 text-sm text-gray-500">Everything is well stocked. 🎉</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-gray-500 bg-gray-50">
                <tr><th className="px-5 py-2">Product</th><th className="px-5 py-2">Category</th><th className="px-5 py-2">Stock</th></tr>
              </thead>
              <tbody>
                {lowStock.map((p) => (
                  <tr key={p.id} className="border-t">
                    <td className="px-5 py-2 font-medium">{p.name}</td>
                    <td className="px-5 py-2 text-gray-500 capitalize">{p.category?.name}</td>
                    <td className="px-5 py-2"><span className="text-amber-600 font-semibold">{p.stock}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="font-semibold text-gray-700 mb-3">Catalog</h3>
          <ul className="space-y-2 text-sm">
            <li className="flex justify-between"><span className="text-gray-500">Categories</span><span className="font-semibold">{categories}</span></li>
            <li className="flex justify-between"><span className="text-gray-500">Avg. price</span><span className="font-semibold">${total ? (products.reduce((s, p) => s + Number(p.price), 0) / total).toFixed(2) : "0.00"}</span></li>
            <li className="flex justify-between"><span className="text-gray-500">Out of stock</span><span className="font-semibold">{outOfStock}</span></li>
          </ul>
          <Link href="/admin/products" className="mt-4 inline-block w-full text-center bg-brand text-white rounded-lg py-2 text-sm font-medium hover:bg-brand-deep transition-colors">
            + Add a product
          </Link>
        </div>
      </div>
    </div>
  );
}
