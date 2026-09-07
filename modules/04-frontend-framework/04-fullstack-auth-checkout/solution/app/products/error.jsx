// error.jsx is a special Next.js file: an ERROR BOUNDARY. If the products page
// throws while rendering/fetching, Next.js catches it and shows this instead of
// crashing the whole app. Error boundaries MUST be Client Components, which is
// why "use client" is required here.
"use client";
export default function Error() {
  return <p className="text-red-600">Could not load products — is the API running?</p>;
}
