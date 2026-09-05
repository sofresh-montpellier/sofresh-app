"use client";

import { Trash2 } from "lucide-react";

const euro = (value) =>
  Number(value || 0).toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
  });

const getProductImage = (product) => {
  if (product.image_url) {
    return product.image_url;
  }

  const text = `${product.category || ""} ${product.name || ""}`
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (text.includes("burger")) return "/cat-burgers.png";
  if (text.includes("salade")) return "/cat-salades.png";
  if (text.includes("wrap")) return "/cat-wraps.png";
  if (text.includes("pate")) return "/cat-pates.png";
  if (text.includes("soupe")) return "/cat-soupes.png";
  if (text.includes("panini")) return "/cat-paninis.png";
  if (text.includes("club")) return "/cat-clubs.png";
  if (text.includes("sandwich")) return "/cat-sandwichs.png";
  if (text.includes("dessert")) return "/cat-desserts.png";
  if (text.includes("boisson")) return "/cat-boissons.png";
  if (text.includes("smoothie")) return "/cat-smoothies.png";
  if (text.includes("formule")) return "/cat-formules.png";

  return "/logo-carre.png";
};

const formatPickupDate = (date) => {
  if (!date) return "";

  const formatted =
    new Intl.DateTimeFormat("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
    }).format(date);

  return (
    formatted.charAt(0).toUpperCase() +
    formatted.slice(1)
  );
};

export default function Cart({
  open,
  onClose,
  cart,
  products,
  cartCount,
  cartTotal,
  changeQuantity,
  loadingSettings,
  dates,
  pickupDate,
  iso,
  pickupTime,
  customerName,
  setCustomerName,
  customerPhone,
  setCustomerPhone,
  paymentLoading,
  serviceOpen,
  submitOrder,
  message,
  pageMode = false,
  onEditPickup,
}) {
  const selectedDate = dates.find(
    (date) => iso(date) === pickupDate
  );

  const cartContent = (
    <>
      <div className="panel-head">
        <h2>Votre commande</h2>

        {!pageMode && (
          <button
            type="button"
            className="close"
            onClick={onClose}
            aria-label="Fermer le panier"
          >
            ×
          </button>
        )}
      </div>

      {cartCount === 0 && (
        <div className="empty">
          Votre panier est vide.
        </div>
      )}

      {Object.entries(cart).map(([id, quantity]) => {
        const product = products.find(
          (currentProduct) =>
            String(currentProduct.id) === String(id)
        );

        if (!product) {
          return null;
        }

        return (
          <div className="cart-item" key={id}>
            <div
              style={{
                display: "flex",
                gap: "12px",
                alignItems: "center",
                minWidth: 0,
              }}
            >
              <img
                src={getProductImage(product)}
                alt={product.name}
                style={{
                  width: "64px",
                  height: "64px",
                  borderRadius: "12px",
                  objectFit: "cover",
                  border: "1px solid #ece8d4",
                  flexShrink: 0,
                }}
              />

              <div style={{ minWidth: 0 }}>
                <strong>{product.name}</strong>

                <div>
                  {quantity} × {euro(product.price)}
                </div>

                <strong
                  style={{
                    color: "var(--green-dark)",
                  }}
                >
                  {euro(
                    Number(product.price) * quantity
                  )}
                </strong>
              </div>
            </div>

            <div
              className="cart-item-actions"
              style={{
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "flex-end",
                gap: "7px",
                alignSelf: "center",
              }}
            >
              <button
                type="button"
                onClick={() =>
                  changeQuantity(product.id, -1)
                }
                aria-label={`Retirer une unité de ${product.name}`}
                style={{
                  width: "32px",
                  height: "32px",
                  padding: 0,
                  border: "none",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  lineHeight: 1,
                }}
              >
                −
              </button>

              <span
                style={{
                  minWidth: "18px",
                  textAlign: "center",
                  fontWeight: "700",
                  lineHeight: 1,
                }}
              >
                {quantity}
              </span>

              <button
                type="button"
                onClick={() =>
                  changeQuantity(product.id, 1)
                }
                aria-label={`Ajouter une unité de ${product.name}`}
                style={{
                  width: "32px",
                  height: "32px",
                  padding: 0,
                  border: "none",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  lineHeight: 1,
                }}
              >
                +
              </button>

              <button
                type="button"
                aria-label={`Supprimer ${product.name}`}
                title="Supprimer"
                onClick={() =>
                  changeQuantity(
                    product.id,
                    -quantity
                  )
                }
                style={{
                  width: "36px",
                  height: "36px",
                  marginLeft: "2px",
                  padding: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  alignSelf: "center",
                  flexShrink: 0,
                  border: "none",
                  borderRadius: "10px",
                  background: "#F2F3EF",
                  color: "#5A6257",
                  cursor: "pointer",
                  lineHeight: 1,
                }}
              >
                <Trash2
                  size={19}
                  strokeWidth={1.8}
                />
              </button>
            </div>
          </div>
        );
      })}

      <div className="cart-pickup-summary">
        <div className="cart-pickup-summary-text">
          <span>RETRAIT</span>

          <strong>
            {selectedDate && pickupTime
              ? `${formatPickupDate(selectedDate)} • ${pickupTime}`
              : "Créneau de retrait non sélectionné"}
          </strong>
        </div>

        <button
          type="button"
          className="cart-pickup-edit"
          onClick={() => {
            if (onEditPickup) {
              onEditPickup();
              return;
            }

            if (selectedDate) {
              localStorage.setItem(
                "sofresh_pickup_date",
                iso(selectedDate)
              );
            }

            if (pickupTime) {
              localStorage.setItem(
                "sofresh_pickup_time",
                pickupTime
              );
            }

            onClose();

            window.location.href =
              "/accueil-v2#retrait";
          }}
        >
          Modifier
        </button>
      </div>

      <label htmlFor="customer-name">
        Nom
      </label>

      <input
        id="customer-name"
        value={customerName}
        onChange={(event) =>
          setCustomerName(event.target.value)
        }
        placeholder="Votre nom"
        autoComplete="name"
      />

      <label htmlFor="customer-phone">
        Téléphone
      </label>

      <input
        id="customer-phone"
        type="tel"
        value={customerPhone}
        onChange={(event) =>
          setCustomerPhone(event.target.value)
        }
        placeholder="06 00 00 00 00"
        autoComplete="tel"
      />

      <div
        style={{
          marginTop: "18px",
          marginBottom: "18px",
          padding: "15px 16px",
          borderRadius: "14px",
          background: "#F8FAF1",
          border: "1px solid #DDE8B5",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span
          style={{
            color: "#6A6F63",
            fontSize: "13px",
          }}
        >
          🛒 {cartCount}{" "}
          {cartCount > 1 ? "articles" : "article"}
        </span>

        <div
          style={{
            textAlign: "right",
          }}
        >
          <div
            style={{
              fontSize: "11px",
              fontWeight: "900",
              color: "#5A7F0D",
            }}
          >
            TOTAL
          </div>

          <strong
            style={{
              fontSize: "24px",
              color: "#5A7F0D",
            }}
          >
            {euro(cartTotal)}
          </strong>
        </div>
      </div>

      <button
        type="button"
        className="primary"
        style={{
          width: "100%",
          minHeight: "48px",
        }}
        disabled={
          paymentLoading ||
          loadingSettings ||
          !serviceOpen ||
          cartCount === 0 ||
          !pickupDate ||
          !pickupTime
        }
        onClick={submitOrder}
      >
        {paymentLoading
          ? "Redirection vers le paiement…"
          : serviceOpen
            ? "Payer et valider la commande"
            : "Commandes actuellement fermées"}
      </button>

      {message && (
        <div className="message">
          {message}
        </div>
      )}

      {pageMode && (
        <button
          type="button"
          onClick={onClose}
          style={{
            width: "100%",
            minHeight: "44px",
            marginTop: "12px",
            border: "none",
            background: "transparent",
            color: "#5A7F0D",
            fontWeight: "700",
            cursor: "pointer",
          }}
        >
          ← Continuer mes achats
        </button>
      )}
    </>
  );

  if (pageMode) {
    return (
      <main
        style={{
          width: "100%",
          maxWidth: "600px",
          margin: "0 auto",
          padding: "92px 14px 40px",
        }}
      >
        <section
          style={{
            background: "#ffffff",
            borderRadius: "22px",
            padding: "18px",
            boxShadow:
              "0 8px 30px rgba(0,0,0,0.08)",
          }}
        >
          {cartContent}
        </section>
      </main>
    );
  }

  return (
    <>
      <div
        className={`overlay ${open ? "open" : ""}`}
        onClick={onClose}
      />

      <aside
        className={`panel ${open ? "open" : ""}`}
      >
        {cartContent}
      </aside>
    </>
  );
}
