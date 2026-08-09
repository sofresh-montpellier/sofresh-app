"use client";

import Image from "next/image";

const euro = (value) =>
  Number(value || 0).toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
  });

export default function ProductCard({
  product,
  onAdd,
}) {
  return (
    <article className="card">
      {product.image_url ? (
        <img
          src={product.image_url}
          alt={product.name}
          style={{
            display: "block",
            width: "100%",
            aspectRatio: "1 / 1",
            objectFit: "cover",
            background: "#fbfbf9",
          }}
        />
      ) : (
        <div
          style={{
            width: "100%",
            aspectRatio: "1 / 1",
            display: "grid",
            placeItems: "center",
            padding: "30px",
            background:
              "linear-gradient(135deg, #fbfbf9, #f3edcf)",
          }}
        >
          <Image
            src="/logo-sofresh.png"
            alt="So Fresh Salade"
            width={300}
            height={120}
            style={{
              width: "80%",
              height: "auto",
              objectFit: "contain",
              opacity: 0.72,
            }}
          />
        </div>
      )}

      <div className="card-body">
        <span
          style={{
  display: "block",
  width: "100%",
  aspectRatio: "1 / 1",
  objectFit: "cover",
  background: "#fbfbf9",
  transform: "scale(1.04)",
  transition: "transform .25s ease, filter .25s ease",
  filter: "contrast(1.06) saturate(1.08)",
}}
        >
          {product.normalized_category}
        </span>

        <h3>{product.name}</h3>

        <p className="desc">
          {product.description ||
            "Préparé avec soin par So Fresh."}
        </p>

        <div className="row">
          <span className="price">
            {euro(product.price)}
          </span>

          <button
            type="button"
            className="primary"
            onClick={() => onAdd(product.id)}
          >
            Ajouter
          </button>
        </div>
      </div>
    </article>
  );
}
