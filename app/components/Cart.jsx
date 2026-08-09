"use client";

const euro = (value) =>
  Number(value || 0).toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
  });

const getProductImage = (product) => {
  // Si le produit possède sa propre photo, on l'utilise
  if (product.image_url) {
    return product.image_url;
  }

  // Sinon, on cherche une image correspondant à sa catégorie ou son nom
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

  // Image de secours
  return "/logo-carre.png";
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
  dateLabel,
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
}) {
  const selectedDate = dates.find(
    (date) => iso(date) === pickupDate
  );

  return (
    <>
      <div
        className={`overlay ${open ? "open" : ""}`}
        onClick={onClose}
      />

      <aside className={`panel ${open ? "open" : ""}`}>
        <div className="panel-head">
          <h2>Votre commande</h2>

          <button
            type="button"
            className="close"
            onClick={onClose}
            aria-label="Fermer le panier"
          >
            ×
          </button>
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

                <div>
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

              <div className="cart-item-actions">
                <button
                  type="button"
                  onClick={() =>
                    changeQuantity(product.id, -1)
                  }
                  aria-label={`Retirer un ${product.name}`}
                >
                  −
                </button>

                <span>{quantity}</span>

                <button
                  type="button"
                  onClick={() =>
                    changeQuantity(product.id, 1)
                  }
                  aria-label={`Ajouter un ${product.name}`}
                >
                  +
                </button>

                <button
                  type="button"
                  className="remove-cart-item"
                  onClick={() =>
                    changeQuantity(
                      product.id,
                      -quantity
                    )
                  }
                >
                  Supprimer
                </button>
              </div>
            </div>
          );
        })}

        {/* CRÉNEAU CHOISI SUR L'ACCUEIL */}

        <div className="cart-pickup-summary">
          <span>RETRAIT</span>

          <strong>
            {selectedDate && pickupTime
              ? `${dateLabel(selectedDate)} • ${pickupTime}`
              : "Créneau de retrait non sélectionné"}
          </strong>
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

        <div className="cart-summary">
          <span>
            🛒 {cartCount}{" "}
            {cartCount > 1 ? "articles" : "article"}
          </span>

          <span>TOTAL</span>

          <strong>
            {euro(cartTotal)}
          </strong>
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
      </aside>
    </>
  );
}