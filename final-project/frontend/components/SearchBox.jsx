// Client component: it tracks input text and navigates on submit.
"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export default function SearchBox() {
  const router = useRouter();          // lets us change the URL programmatically
  const params = useSearchParams();    // read the current ?search=... value
  // Pre-fill the box from the URL so a refresh keeps the search term.
  const [value, setValue] = useState(params.get("search") || "");

  // On submit, push a new URL with the search term. The products page reads that
  // query param on the server and fetches matching products — no manual fetch here.
  function submit(e) {
    e.preventDefault(); // stop the browser's default full-page form reload
    router.push(value ? `/products?search=${encodeURIComponent(value)}` : "/products");
  }

  return (
    // A "controlled input": React state is the single source of truth for the value.
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
