import Link from "next/link";
import AddToCartButton from "./AddToCartButton";

// Storefront product card with image, used on the home and products pages.
// No "use client" here: this is a Server Component that just displays `product`
// props. The interactive part (Add to cart) is split into its own client component.
export default function ProductCard({ product }) {
  const out = product.stock === 0; // true when sold out -> drives the badge + disabled button
  return (
    <div className="group bg-white rounded-2xl border border-line shadow-card hover:shadow-cardhover hover:-translate-y-0.5 transition-all duration-200 overflow-hidden flex flex-col">
      <Link href={`/products/${product.id}`} className="block relative aspect-[4/3] bg-sand overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={product.imageUrl || "/product-images/placeholder.svg"}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-300"
        />
        {/* `{out && <...>}` renders the badge only when the product is sold out. */}
        {out && (
          <span className="absolute top-2.5 left-2.5 bg-white/95 text-red-600 text-xs font-semibold px-2 py-0.5 rounded-full shadow-sm">
            Sold out
          </span>
        )}
      </Link>
      <div className="p-4 flex flex-col gap-1.5 flex-1">
        {product.category?.name && (
          <p className="text-[11px] font-medium tracking-wide text-muted capitalize">{product.category.name}</p>
        )}
        <Link
          href={`/products/${product.id}`}
          className="font-medium leading-snug hover:text-brand transition-colors line-clamp-1"
        >
          {product.name}
        </Link>
        <p className="font-display text-lg font-bold text-gold-deep mt-auto pt-1">${product.price}</p>
        <AddToCartButton product={product} />
      </div>
    </div>
  );
}
