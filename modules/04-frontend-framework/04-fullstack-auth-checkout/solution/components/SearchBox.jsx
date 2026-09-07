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
    <form onSubmit={submit} className="flex gap-2 mb-6">
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search phones, laptops, audio…"
        className="flex-1 rounded-full border border-line bg-white px-4 py-2.5 text-sm placeholder:text-muted/70 focus:border-brand"
      />
      <button className="rounded-full bg-brand hover:bg-brand-deep text-white text-sm font-medium px-5 transition-colors">
        Search
      </button>
    </form>
  );
}
