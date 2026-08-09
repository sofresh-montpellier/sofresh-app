"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import HomeHeader from "./HomeHeader";

export default function AppShell({ children }) {
  const [cartCount, setCartCount] = useState(0);

  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const updateCartCount = (event) => {
      setCartCount(event.detail || 0);
    };

    window.addEventListener("sofresh-cart-count", updateCartCount);

    return () => {
      window.removeEventListener("sofresh-cart-count", updateCartCount);
    };
  }, []);

  const handleCartClick = () => {
    if (pathname === "/commander") {
      window.dispatchEvent(new Event("sofresh-open-cart"));
    } else {
      router.push("/commander?openCart=1");
    }
  };

  return (
    <>
      <HomeHeader
        cartCount={cartCount}
        onCartClick={handleCartClick}
      />

      {children}
    </>
  );
}