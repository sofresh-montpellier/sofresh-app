"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import HomeHeader from "./HomeHeader";

export default function AppShell({ children }) {
  const [cartCount, setCartCount] = useState(0);
  const [showSplash, setShowSplash] = useState(true);

  const pathname = usePathname();
  const router = useRouter();

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

  const handleCartClick = () => {
    if (pathname === "/commander") {
      window.dispatchEvent(
        new Event("sofresh-open-cart")
      );
    } else {
      router.push("/commander?openCart=1");
    }
  };

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

      <HomeHeader
        cartCount={cartCount}
        onCartClick={handleCartClick}
      />

      {children}
    </>
  );
}