import Image from "next/image";
import Link from "next/link";

import { formatPrice } from "@/lib/format";
import { isRemoteImage } from "@/lib/images";
import type { MenuProduct } from "@/lib/types";

type ProductCardProps = {
  product: MenuProduct;
};

export default function ProductCard({ product }: ProductCardProps) {
  return (
    <Link href={`/product/${product.id}`} className="group block">
      <article className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#141414] transition duration-300 hover:-translate-y-1 hover:border-white/20">
        <div className="relative h-52 overflow-hidden bg-[#111]">
          {product.badge && (
            <span className="absolute left-4 top-4 z-10 rounded-full bg-red-600 px-3 py-1 text-[10px] font-black tracking-wider">
              {product.badge}
            </span>
          )}

          <Image
            src={product.image}
            alt={product.name}
            fill
            unoptimized={isRemoteImage(product.image)}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition duration-500 group-hover:scale-105"
          />

          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        </div>

        <div className="p-5">
          <h3 className="text-lg font-black">{product.name}</h3>

          <p className="mt-2 line-clamp-2 min-h-10 text-sm leading-5 text-neutral-400">
            {product.description}
          </p>

          <div className="mt-5 flex items-center justify-between gap-4">
            <span className="text-lg font-black">
              {formatPrice(product.price)}
            </span>

            <span
              aria-hidden
              className="flex h-11 w-11 items-center justify-center rounded-full bg-red-600 text-2xl font-light transition group-hover:bg-red-500 group-active:scale-90"
            >
              +
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
}
