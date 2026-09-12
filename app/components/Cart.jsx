"use client";

import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CreditCard,
  Pencil,
  Phone,
  Trash2,
  UserRound,
} from "lucide-react";

import styles from "./Cart.module.css";

const euro = (value) =>
  Number(value || 0).toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
  });

const getProductImage = (product) => {
  if (product?.image_url) {
    return product.image_url;
  }

  const text = `${product?.category || ""} ${product?.name || ""}`
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (text.includes("burger")) return "/cat-burgers.png";
  if (text.includes("maxi salade")) return "/cat-maxi-salades.png";
  if (text.includes("salade")) return "/cat-salades.png";
  if (text.includes("wrap")) return "/cat-wraps.png";
  if (text.includes("pate")) return "/cat-pates.png";
  if (text.includes("soupe")) return "/cat-soupes.png";
  if (text.includes("panini")) return "/cat-paninis.png";
  if (text.includes("club")) return "/cat-clubs.png";
  if (text.includes("taco")) return "/cat-tacos.png";
  if (text.includes("sandwich")) return "/cat-sandwichs.png";
  if (text.includes("bagel")) return "/cat-bagels.png";
  if (text.includes("dessert")) return "/cat-desserts.png";
  if (text.includes("boisson")) return "/cat-boissons.png";
  if (text.includes("formule")) return "/cat-formules.png";

  return "/produit-generique.png";
};

const formatPickupDate = (date) => {
  if (!date) return "";

  const formatted = new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(date);

  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
};

function getFormulaDescription(entry) {
  const selections = Array.isArray(entry?.selections)
    ? entry.selections
    : [];

  const names = selections
    .map(
      (selection) =>
        selection?.product_name ||
        selection?.productName ||
        selection?.name ||
        ""
    )
    .filter(Boolean);

  return names.join(" · ");
}

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

  const entries = Object.entries(cart);

  if (pageMode) {
    return (
      <main className={styles.page}>
        <header className={styles.header}>
          <button
            type="button"
            onClick={onClose}
            className={styles.back}
          >
            <ArrowLeft size={20} />
            <span>Retour</span>
          </button>

          <div className={styles.headerTitleRow}>
            <h1>Votre commande</h1>
            <span
              className={styles.headerAccent}
              aria-hidden="true"
            />
          </div>

          <p className={styles.thanks}>
            Merci pour votre confiance !
          </p>

          <img
            src="/basil-commander.png"
            alt=""
            aria-hidden="true"
            className={styles.basil}
          />
        </header>

        {cartCount === 0 ? (
          <section className={styles.emptyCard}>
            <strong>Votre panier est vide.</strong>
            <button
              type="button"
              onClick={onClose}
              className={styles.emptyButton}
            >
              Retour à la carte
            </button>
          </section>
        ) : (
          <section className={styles.items}>
            {entries.map(([id, entry]) => {
              const isFormula =
                typeof entry === "object" &&
                entry?.type === "formula";

              const quantity = isFormula
                ? Number(entry?.qty || 0)
                : Number(entry || 0);

              const product = isFormula
                ? products.find(
                    (item) =>
                      String(item.id) ===
                      String(entry?.formula_product_id)
                  )
                : products.find(
                    (item) => String(item.id) === String(id)
                  );

              if (!isFormula && !product) {
                return null;
              }

              const name = isFormula
                ? entry?.name || product?.name || "Formule"
                : product.name;

              const description = isFormula
                ? getFormulaDescription(entry) ||
                  product?.description ||
                  "Votre formule So Fresh."
                : product.description ||
                  "Préparé avec soin par So Fresh.";

              const unitPrice = isFormula
                ? Number(entry?.price || product?.price || 0)
                : Number(product.price || 0);

              const image = isFormula
                ? getProductImage(
                    product || {
                      category: "Formules",
                      name,
                    }
                  )
                : getProductImage(product);

              return (
                <article className={styles.itemCard} key={id}>
                  <img
                    src={image}
                    alt={name}
                    className={styles.itemImage}
                  />

                  <div className={styles.itemBody}>
                    <div className={styles.itemTop}>
                      <div className={styles.itemCopy}>
                        <h2>{name}</h2>
                        <p>{description}</p>
                      </div>

                      <button
                        type="button"
                        className={styles.remove}
                        onClick={() =>
                          changeQuantity(id, -quantity)
                        }
                        aria-label={`Supprimer ${name}`}
                      >
                        <Trash2 size={18} />
                        <span>Supprimer</span>
                      </button>
                    </div>

                    <div className={styles.itemBottom}>
                      <span className={styles.price}>
                        {euro(unitPrice)}
                      </span>

                      <div className={styles.quantity}>
                        <button
                          type="button"
                          onClick={() =>
                            changeQuantity(id, -1)
                          }
                          aria-label={`Retirer une unité de ${name}`}
                        >
                          −
                        </button>

                        <span>{quantity}</span>

                        <button
                          type="button"
                          onClick={() =>
                            changeQuantity(id, 1)
                          }
                          aria-label={`Ajouter une unité de ${name}`}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        )}

        <section className={styles.pickupCard}>
          <div className={styles.pickupIcon}>
            <CalendarDays size={28} />
          </div>

          <div className={styles.pickupCopy}>
            <span>RETRAIT</span>
            <strong>
              {selectedDate && pickupTime
                ? `${formatPickupDate(
                    selectedDate
                  )} · ${pickupTime}`
                : "Créneau de retrait non sélectionné"}
            </strong>
          </div>

          <button
            type="button"
            className={styles.pickupEdit}
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
            <Pencil size={18} />
            <span>Modifier</span>
          </button>
        </section>

        <section className={styles.customerSection}>
          <h2>Vos coordonnées</h2>
          <p>Pour finaliser votre commande</p>

          <label className={styles.field}>
            <UserRound size={23} />
            <span>
              <small>Nom</small>
              <input
                id="customer-name"
                value={customerName}
                onChange={(event) =>
                  setCustomerName(event.target.value)
                }
                placeholder="Votre nom"
                autoComplete="name"
              />
            </span>
          </label>

          <label className={styles.field}>
            <Phone size={23} />
            <span>
              <small>Téléphone</small>
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
            </span>
          </label>
        </section>

        <section className={styles.summary}>
          <h2>Récapitulatif</h2>

          <div className={styles.summaryLine}>
            <span>
              {cartCount}{" "}
              {cartCount > 1 ? "articles" : "article"}
            </span>
            <span>{euro(cartTotal)}</span>
          </div>

          <div
            className={`${styles.summaryLine} ${styles.totalLine}`}
          >
            <strong>Total</strong>
            <strong>{euro(cartTotal)}</strong>
          </div>

          <button
            type="button"
            className={styles.payButton}
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
            <CreditCard size={27} />

            <span>
              <strong>
                {paymentLoading
                  ? "Redirection vers le paiement…"
                  : serviceOpen
                    ? "Valider ma commande"
                    : "Commandes actuellement fermées"}
              </strong>
              <small>Passer au paiement sécurisé</small>
            </span>

            <ArrowRight size={28} />
          </button>
        </section>

        {message && (
          <div className={styles.message}>{message}</div>
        )}
      </main>
    );
  }

  const cartContent = (
    <>
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

      {entries.map(([id, entry]) => {
        const isFormula =
          typeof entry === "object" &&
          entry?.type === "formula";

        const quantity = isFormula
          ? Number(entry?.qty || 0)
          : Number(entry || 0);

        const product = isFormula
          ? products.find(
              (item) =>
                String(item.id) ===
                String(entry?.formula_product_id)
            )
          : products.find(
              (item) => String(item.id) === String(id)
            );

        if (!isFormula && !product) {
          return null;
        }

        const name = isFormula
          ? entry?.name || product?.name || "Formule"
          : product.name;

        const unitPrice = isFormula
          ? Number(entry?.price || product?.price || 0)
          : Number(product.price || 0);

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
                src={getProductImage(
                  product || {
                    category: isFormula
                      ? "Formules"
                      : "",
                    name,
                  }
                )}
                alt={name}
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
                <strong>{name}</strong>
                <div>
                  {quantity} × {euro(unitPrice)}
                </div>
                <strong
                  style={{
                    color: "var(--green-dark)",
                  }}
                >
                  {euro(unitPrice * quantity)}
                </strong>
              </div>
            </div>

            <div
              className="cart-item-actions-row"
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
                  changeQuantity(id, -1)
                }
              >
                −
              </button>

              <span
                style={{
                  minWidth: "18px",
                  textAlign: "center",
                  fontWeight: "700",
                }}
              >
                {quantity}
              </span>

              <button
                type="button"
                onClick={() =>
                  changeQuantity(id, 1)
                }
              >
                +
              </button>

              <button
                type="button"
                aria-label={`Supprimer ${name}`}
                title="Supprimer"
                onClick={() =>
                  changeQuantity(id, -quantity)
                }
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
              ? `${formatPickupDate(
                  selectedDate
                )} • ${pickupTime}`
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

            onClose();
            window.location.href =
              "/accueil-v2#retrait";
          }}
        >
          Modifier
        </button>
      </div>

      <label htmlFor="customer-name">Nom</label>
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
        <span>
          {cartCount}{" "}
          {cartCount > 1
            ? "articles"
            : "article"}
        </span>

        <strong>{euro(cartTotal)}</strong>
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
        <div className="message">{message}</div>
      )}
    </>
  );

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
