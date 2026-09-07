"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";

export default function HomeHeader({
  cartCount = 0,
}) {
  return (
    <Link
      href="/panier"
      className="sf-fixed-cart"
      aria-label="Voir mon panier"
    >
      <ShoppingBag
        size={25}
        strokeWidth={2.2}
      />

      {cartCount > 0 && (
        <span className="sf-fixed-cart-count">
          {cartCount}
        </span>
      )}
    </Link>
  );
}