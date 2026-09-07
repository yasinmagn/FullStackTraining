"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export default function SearchBox() {
  const router = useRouter();
  const params = useSearchParams();
  const [value, setValue] = useState(params.get("search") || "");

  function submit(e) {
    e.preventDefault();
    router.push(value ? `/products?search=${encodeURIComponent(value)}` : "/products");
  }

  return (
    <form onSubmit={submit} className="flex gap-2 mb-5">
      <input value={value} onChange={(e) => setValue(e.target.value)}
             placeholder="Search products..."
             className="flex-1 border rounded-md p-2" />
      <button className="bg-emerald-700 text-white px-4 rounded-md">Search</button>
    </form>
  );
}
