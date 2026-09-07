// "use client" — this component uses hooks (useState, useRouter,
// useSearchParams) and handles form input, so it must run on the client.
//
// IMPORTANT: because SearchBox calls useSearchParams (which reads the URL query
// string on the client), Next.js requires this component to sit inside a
// <Suspense> boundary. That way the rest of the page can prerender on the
// server while this part waits for the client-side URL info. If you ever see a
// build error about useSearchParams needing Suspense, wrap <SearchBox /> in
// <Suspense fallback={...}> where it is rendered.
"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export default function SearchBox() {
  // useRouter lets us navigate programmatically (change the URL from code).
  const router = useRouter();
  // useSearchParams reads the current URL query string (e.g. ?search=shoes).
  const params = useSearchParams();
  // Local input state, pre-filled with any existing "search" value from the URL.
  const [value, setValue] = useState(params.get("search") || "");

  // Runs when the form is submitted.
  function submit(e) {
    e.preventDefault(); // stop the browser's default full-page reload
    // Push a new URL. Navigating to /products?search=... re-runs the server
    // component on the products page, which fetches the filtered results.
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
