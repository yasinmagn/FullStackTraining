// loading.jsx is a special Next.js file. It is shown AUTOMATICALLY while the
// matching page (here, the products page) is fetching its data on the server.
// You don't call it yourself — Next.js swaps it in until the page is ready.
export default function Loading() {
  return <p className="animate-pulse">Loading products…</p>;
}
