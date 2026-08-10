"use client";

import Image from "next/image";
import Link from "next/link";
import {
  UserRound,
  ShoppingBag,
  Utensils,
} from "lucide-react";

export default function HomeHeader({
  cartCount = 0,
  onCartClick,
}) {
  return (
    <header className="home-header">

      {/* LOGO À GAUCHE */}
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

      {/* COMPTE */}
      <Link
        href="/compte"
        className="home-header-action"
      >
        <UserRound size={25} strokeWidth={1.7} />
        <span>Compte</span>
      </Link>

      {/* COMMANDER */}
      <Link
        href="/commander"
        className="home-header-action"
      >
        <Utensils size={25} strokeWidth={1.7} />
        <span>Commander</span>
      </Link>

      {/* PANIER */}
      <button
        type="button"
        className="home-header-action home-header-cart"
        onClick={onCartClick}
      >
        <span className="home-header-cart-icon">
          <ShoppingBag size={25} strokeWidth={1.7} />

          {cartCount > 0 && (
            <span className="home-header-cart-count">
              {cartCount}
            </span>
          )}
        </span>

        <span>Panier</span>
      </button>

    </header>
  );
}