// loading.jsx is a SPECIAL Next.js App Router file.
// When a server component in this route (products/page.jsx) is fetching data,
// Next.js automatically shows this UI as an instant loading state until the
// data is ready. It works via React Suspense behind the scenes — you don't
// wire it up yourself, just having this file here is enough.
export default function Loading() {
  return <p className="animate-pulse">Loading products…</p>;
}
