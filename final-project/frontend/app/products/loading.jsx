// Special Next.js file: `loading.jsx` is shown automatically while the sibling
// server page (products/page.jsx) is still fetching its data. No wiring needed.
export default function Loading() {
  return <p className="animate-pulse">Loading products…</p>;
}
