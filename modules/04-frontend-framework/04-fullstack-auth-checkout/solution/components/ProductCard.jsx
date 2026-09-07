import Link from "next/link";
import AddToCartButton from "./AddToCartButton";

// Storefront product card with image, used on the home and products pages.
export default function ProductCard({ product }) {
  const out = product.stock === 0;
  return (
    <div className="group bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col">
      <Link href={`/products/${product.id}`} className="block relative aspect-[3/2] bg-gray-100 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={product.imageUrl || "/product-images/placeholder.svg"}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        {out && (
          <span className="absolute top-2 left-2 bg-red-600 text-white text-xs font-semibold px-2 py-0.5 rounded-full">
            Out of stock
          </span>
        )}
      </Link>
      <div className="p-4 flex flex-col gap-1 flex-1">
        <Link href={`/products/${product.id}`} className="font-semibold hover:underline line-clamp-1">
          {product.name}
        </Link>
        {product.category?.name && (
          <p className="text-xs text-gray-400 capitalize">{product.category.name}</p>
        )}
        <p className="text-emerald-700 font-bold text-lg mt-auto">${product.price}</p>
        <AddToCartButton product={product} />
      </div>
    </div>
  );
}
