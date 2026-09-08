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
      style={{
        background: "rgba(55, 55, 48, 0.48)",
        backdropFilter: "blur(18px) saturate(135%)",
        WebkitBackdropFilter:
          "blur(18px) saturate(135%)",
        border:
          "1px solid rgba(255, 255, 255, 0.22)",
        color: "#ffffff",
        boxShadow:
          "0 6px 18px rgba(0, 0, 0, 0.14)",
      }}
    >
      <ShoppingBag
        size={25}
        strokeWidth={2.2}
        color="#ffffff"
      />

      {cartCount > 0 && (
        <span
          className="sf-fixed-cart-count"
          style={{
            background: "#FFD400",
            color: "#5A7F0D",
            border: "2px solid #ffffff",
          }}
        >
          {cartCount}
        </span>
      )}
    </Link>
  );
}