"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Utensils,
  UserRound,
} from "lucide-react";

import HomeHeader from "./HomeHeader";

export default function AppShell({ children }) {
  const [cartCount, setCartCount] = useState(0);
  const [showSplash, setShowSplash] = useState(true);

  const pathname = usePathname();

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 1400);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const updateCartCount = (event) => {
      setCartCount(event.detail || 0);
    };

    window.addEventListener(
      "sofresh-cart-count",
      updateCartCount
    );

    return () => {
      window.removeEventListener(
        "sofresh-cart-count",
        updateCartCount
      );
    };
  }, []);

  const isAccueil =
    pathname === "/" ||
    pathname.startsWith("/accueil-v2");

  const isCommander =
    pathname.startsWith("/commander") ||
    pathname.startsWith("/panier");

  const isCompte =
    pathname.startsWith("/compte");

  const showCart =
    pathname === "/" ||
    pathname.startsWith("/accueil-v2") ||
    pathname.startsWith("/commander");

  return (
    <>
      {showSplash && (
        <div className="splash-screen">
          <img
            src="/logo-carre.png"
            alt="So Fresh"
            className="splash-logo"
          />

          <div className="splash-loader"></div>
        </div>
      )}

      {showCart && (
        <HomeHeader cartCount={cartCount} />
      )}

      <div className="sf-app-with-bottom-nav">
        {children}
      </div>

      <nav
        className="sf-bottom-nav"
        aria-label="Navigation principale"
      >
        <Link
          href="/accueil-v2"
          className={
            isAccueil
              ? "sf-bottom-nav-item active"
              : "sf-bottom-nav-item"
          }
        >
          <Home size={25} strokeWidth={1.9} />
          <span>Accueil</span>
        </Link>

        <Link
          href="/commander"
          className={
            isCommander
              ? "sf-bottom-nav-item active"
              : "sf-bottom-nav-item"
          }
        >
          <Utensils size={25} strokeWidth={1.9} />
          <span>Commander</span>
        </Link>

        <Link
          href="/compte"
          className={
            isCompte
              ? "sf-bottom-nav-item active"
              : "sf-bottom-nav-item"
          }
        >
          <UserRound size={25} strokeWidth={1.9} />
          <span>Compte</span>
        </Link>
      </nav>
    </>
  );
}