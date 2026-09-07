// Special Next.js file: `error.jsx` renders automatically if the page throws (for
// example, the fetch fails). Error boundaries must be Client Components, hence
// "use client".
"use client";
export default function Error() {
  return <p className="text-red-600">Could not load products — is the API running?</p>;
}
