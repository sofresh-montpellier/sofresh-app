"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  UserRound,
  ShoppingBag,
  Utensils,
} from "lucide-react";

export default function HomeHeader({
  cartCount = 0,
}) {
  const pathname = usePathname();

  if (pathname.startsWith("/payment-success")) {
    return null;
  }

  const isCompte =
    pathname.startsWith("/compte");

  const isCommander =
    pathname.startsWith("/commander");

  const isPanier =
    pathname.startsWith("/panier");

  return (
    <header className="home-header">
      <Link
        href="/accueil-v2"
        className="home-header-logo"
        aria-label="Accueil So Fresh"
      >
        <Image
          src="/logo-carre.png"
          alt="So Fresh"
          width={100}
          height={100}
          priority
          className="home-header-logo-img"
        />
      </Link>

      <Link
        href="/compte"
        className={`home-header-action ${
          isCompte
            ? "home-header-action-active"
            : ""
        }`}
      >
        <UserRound
          size={25}
          strokeWidth={1.45}
        />

        <span>Compte</span>
      </Link>

      <Link
        href="/commander"
        className={`home-header-action ${
          isCommander
            ? "home-header-action-active"
            : ""
        }`}
      >
        <Utensils
          size={25}
          strokeWidth={1.45}
        />

        <span>Commander</span>
      </Link>

      <Link
        href="/panier"
        className={`home-header-action home-header-cart ${
          isPanier
            ? "home-header-action-active"
            : ""
        }`}
        aria-label="Voir mon panier"
      >
        <span
          className="home-header-cart-icon"
          style={{
            position: "relative",
            width: "30px",
            height: "28px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "visible",
          }}
        >
          <ShoppingBag
            size={25}
            strokeWidth={1.45}
          />

          {cartCount > 0 && (
            <span
              className="home-header-cart-count"
              style={{
                position: "absolute",

                top: "-8px",
                right: "-7px",

                minWidth: "18px",
                height: "18px",

                padding: "0 4px",

                display: "flex",
                alignItems: "center",
                justifyContent: "center",

                borderRadius: "999px",

                background: "#FFD400",
                color: "#5A7F0D",

                border: "2px solid #ffffff",

                fontSize: "9px",
                fontWeight: "800",
                lineHeight: "1",

                boxSizing: "border-box",

                zIndex: 2,
              }}
            >
              {cartCount}
            </span>
          )}
        </span>

        <span>Panier</span>
      </Link>
    </header>
  );
}