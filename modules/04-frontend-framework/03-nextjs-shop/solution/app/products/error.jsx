// "use client" marks this as a Client Component (runs in the browser).
// error.jsx is a SPECIAL Next.js file: it acts as an error boundary for this
// route. If products/page.jsx throws while rendering (e.g. the fetch fails),
// Next.js catches it and shows this UI instead of crashing the whole app.
// Error boundaries need client-side features, so error.jsx MUST be a client
// component — that's why "use client" is required at the top.
"use client";
export default function Error() {
  return <p className="text-red-600">Could not load products — is the API running?</p>;
}
