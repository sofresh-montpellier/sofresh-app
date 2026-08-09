"use client";

import ProductCard from "./ProductCard";

export default function ProductGrid({
  products,
  loading,
  onAdd,
}) {
  if (loading) {
    return (
      <div className="empty">
        Chargement du menu…
      </div>
    );
  }

  if (!products.length) {
    return (
      <div className="empty">
        Aucun produit disponible dans cette catégorie.
      </div>
    );
  }

  return (
    <section className="grid">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          onAdd={onAdd}
        />
      ))}
    </section>
  );
}
