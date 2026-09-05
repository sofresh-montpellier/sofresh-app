"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import {
  UserRound,
  Phone,
  Star,
  ReceiptText,
  LogOut,
  Settings,
  Utensils,
} from "lucide-react";

import {
  supabase,
  isSupabaseConfigured,
} from "../../lib/supabase";

const euro = (value) =>
  Number(value || 0).toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
  });

function formatPickupDate(value) {
  if (!value) return "";

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(date);
}

function formatPickupTime(value) {
  return String(value || "")
    .replace(/\s*h\s*/i, " h ")
    .trim();
}

function isFutureOrder(order) {
  if (!order.pickup_date || !order.pickup_time) {
    return false;
  }

  const time = String(order.pickup_time)
    .replace(" h ", ":")
    .replace("h", ":")
    .trim();

  const pickupDateTime = new Date(
    `${order.pickup_date}T${time}`
  );

  return pickupDateTime > new Date();
}

export default function ComptePage() {
  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingOrders, setLoadingOrders] = useState(false);

  const [profileOpen, setProfileOpen] = useState(false);
  const [profileFirstName, setProfileFirstName] =
    useState("");
  const [profileLastName, setProfileLastName] =
    useState("");
  const [profilePhone, setProfilePhone] =
    useState("");
  const [profileSaving, setProfileSaving] =
    useState(false);
  const [profileMessage, setProfileMessage] =
    useState("");

  async function loadOrders(userId) {
    if (!supabase || !userId) {
      setOrders([]);
      return;
    }

    setLoadingOrders(true);

    const { data, error } = await supabase
      .from("orders")
      .select(`
        id,
        order_number,
        pickup_date,
        pickup_time,
        total,
        status,
        payment_status,
        created_at
      `)
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(
        "Erreur chargement historique commandes :",
        error
      );

      setOrders([]);
      setLoadingOrders(false);
      return;
    }

    setOrders(data || []);
    setLoadingOrders(false);
  }

  useEffect(() => {
    async function loadUser() {
      if (!isSupabaseConfigured || !supabase) {
        setLoading(false);
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      const currentUser = user || null;

      setUser(currentUser);

      if (currentUser) {
        await loadOrders(currentUser.id);
      } else {
        setOrders([]);
      }

      setLoading(false);
    }

    loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const currentUser = session?.user || null;

        setUser(currentUser);

        if (currentUser) {
          await loadOrders(currentUser.id);
        } else {
          setOrders([]);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function handleLogout() {
    if (!supabase) return;

    await supabase.auth.signOut();

    setUser(null);
    setOrders([]);
  }

  function openProfileEditor() {
    if (!user) return;

    setProfileFirstName(
      user.user_metadata?.first_name || ""
    );

    setProfileLastName(
      user.user_metadata?.last_name || ""
    );

    setProfilePhone(
      user.user_metadata?.phone || ""
    );

    setProfileMessage("");
    setProfileOpen(true);
  }

  async function saveProfile() {
    if (!supabase || !user) return;

    const firstName = profileFirstName.trim();
    const lastName = profileLastName.trim();
    const phone = profilePhone.trim();

    if (!firstName || !lastName || !phone) {
      setProfileMessage(
        "Merci de renseigner votre prénom, votre nom et votre téléphone."
      );
      return;
    }

    setProfileSaving(true);
    setProfileMessage("");

    const { data, error } =
      await supabase.auth.updateUser({
        data: {
          first_name: firstName,
          last_name: lastName,
          phone,
        },
      });

    if (error) {
      console.error(
        "Erreur mise à jour du profil :",
        error
      );

      setProfileMessage(
        "Vos informations n’ont pas pu être enregistrées."
      );

      setProfileSaving(false);
      return;
    }

    if (data?.user) {
      setUser(data.user);
    }

    setProfileMessage(
      "Vos informations ont bien été enregistrées."
    );

    setProfileSaving(false);

    setTimeout(() => {
      setProfileOpen(false);
      setProfileMessage("");
    }, 700);
  }

  if (loading) {
    return (
      <main className="account-page">
        <div className="account-container">
          <h1>Mon compte</h1>

          <p className="account-intro">
            Chargement de votre compte...
          </p>
        </div>
      </main>
    );
  }

  if (user) {
    const firstName =
      user.user_metadata?.first_name || "";

    const lastName =
      user.user_metadata?.last_name || "";

    const phone =
      user.user_metadata?.phone || "";

    const isAdmin =
      user.app_metadata?.role === "admin";

    const loyaltyEligibleOrders = orders.filter(
      (order) =>
        order.payment_status === "paid" &&
        Number(order.total || 0) >= 10
    );

    const loyaltyCount = loyaltyEligibleOrders.length;

    const loyaltyProgress = Math.min(
      loyaltyCount,
      10
    );

    const loyaltyUnlocked = loyaltyCount >= 10;

    const loyaltyRemaining = Math.max(
      10 - loyaltyCount,
      0
    );

    return (
      <main className="account-page">
        <div className="account-container">

          <h1>Mon compte</h1>

         <p className="account-intro">
  {firstName
    ? `Bonjour ${firstName}`
    : "Bienvenue chez So Fresh"}
</p>

          {/* MES INFORMATIONS */}

          <div className="account-benefits">
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "12px",
                marginBottom: "10px",
              }}
            >
              <h2 style={{ margin: 0 }}>
                Mes informations
              </h2>

              <button
                type="button"
                onClick={openProfileEditor}
                style={{
                  border: "none",
                  background: "transparent",
                  color: "#5A7F0D",
                  fontSize: "12px",
                  fontWeight: "800",
                  cursor: "pointer",
                  padding: "6px 0",
                }}
              >
                Modifier
              </button>
            </div>

            <div className="account-benefit">
              <span className="account-benefit-icon">
                <UserRound
                  size={21}
                  strokeWidth={1.8}
                />
              </span>

              <div>
                <strong>
                  {firstName || lastName
                    ? `${firstName} ${lastName}`.trim()
                    : "Mon profil"}
                </strong>

                <p>{user.email}</p>
              </div>
            </div>

            <div className="account-benefit">
              <span className="account-benefit-icon">
                <Phone
                  size={21}
                  strokeWidth={1.8}
                />
              </span>

              <div>
                <strong>Téléphone</strong>
                <p>{phone || "Non renseigné"}</p>
              </div>
            </div>
          </div>

          {/* FIDÉLITÉ */}

          <div
            style={{
              background: "#ffffff",
              border:
                "1px solid rgba(152, 189, 18, 0.45)",
              borderRadius: "18px",
              padding: "16px",
              marginTop: "14px",
              marginBottom: "14px",
              boxShadow:
                "0 6px 18px rgba(90, 127, 13, 0.07)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "12px",
                marginBottom: "12px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                <span
                  style={{
                    width: "38px",
                    height: "38px",
                    borderRadius: "50%",
                    background: "#F3F7E5",
                    color: "#5A7F0D",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Star
                    size={21}
                    strokeWidth={1.8}
                  />
                </span>

                <div>
                  <h2
                    style={{
                      margin: 0,
                      fontSize: "18px",
                      color: "#183D1F",
                    }}
                  >
                    Ma fidélité
                  </h2>

                  <p
                    style={{
                      margin: "3px 0 0",
                      fontSize: "12px",
                      color: "#6B715F",
                    }}
                  >
                    Achats de 10 € minimum
                  </p>
                </div>
              </div>

              <div
                style={{
                  width: "46px",
                  height: "46px",
                  borderRadius: "50%",
                  background: "#FFD400",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  color: "#5A7F0D",
                }}
              >
                <Star
                  size={24}
                  strokeWidth={1.8}
                />
              </div>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                marginBottom: "10px",
              }}
            >
              <strong
                style={{
                  color: "#5A7F0D",
                  fontSize: "22px",
                }}
              >
                {loyaltyProgress} / 10
              </strong>

              <span
                style={{
                  fontSize: "12px",
                  fontWeight: "700",
                  color: loyaltyUnlocked
                    ? "#5A7F0D"
                    : "#6B715F",
                }}
              >
                {loyaltyUnlocked
                  ? "Avantage débloqué"
                  : `${loyaltyRemaining} restant${
                      loyaltyRemaining > 1 ? "s" : ""
                    }`}
              </span>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(10, minmax(0, 1fr))",
                gap: "5px",
                marginBottom: "12px",
              }}
            >
              {Array.from({ length: 10 }).map(
                (_, index) => (
                  <div
                    key={index}
                    style={{
                      height: "9px",
                      borderRadius: "999px",
                      background:
                        index < loyaltyProgress
                          ? "#98BD12"
                          : "#E8ECD8",
                    }}
                  />
                )
              )}
            </div>

            <p
              style={{
                margin: 0,
                fontSize: "13px",
                lineHeight: 1.45,
                color: "#4F5548",
              }}
            >
              {loyaltyUnlocked
                ? "Votre avantage fidélité de 50 % est débloqué."
                : `Encore ${loyaltyRemaining} achat${
                    loyaltyRemaining > 1 ? "s" : ""
                  } de 10 € minimum avant votre avantage de 50 %.`}
            </p>
          </div>

          {/* COMMANDES */}

          <div className="account-orders account-orders-compact">

            <div className="account-orders-header">
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <ReceiptText
                  size={20}
                  strokeWidth={1.8}
                  color="#5A7F0D"
                />

                <h2>
                  Mon historique de commandes
                </h2>
              </div>

              <Link
                href="/compte/commandes"
                className="account-orders-all-link"
              >
                Voir tout →
              </Link>
            </div>

            {loadingOrders && (
              <p className="account-intro">
                Chargement de vos commandes...
              </p>
            )}

            {!loadingOrders &&
              orders.length === 0 && (
                <p className="account-intro">
                  Vous n’avez pas encore de commande.
                </p>
              )}

            {!loadingOrders &&
              orders.slice(0, 3).map((order) => (
                <Link
                  href={`/compte/commandes/${order.id}`}
                  className="account-order-line"
                  key={order.id}
                >
                  <div className="account-order-line-main">

                    <div>
                      <strong>
                        Commande{" "}
                        <span className="account-order-number">
                          SF-{order.order_number}
                        </span>
                      </strong>

                      <p>
                        {formatPickupDate(
                          order.pickup_date
                        )}
                        {" · "}
                        {formatPickupTime(
                          order.pickup_time
                        )}
                      </p>
                    </div>

                    <div className="account-order-line-right">

                      <span
                        className={`account-order-mini-status ${
                          isFutureOrder(order)
                            ? "future"
                            : "finished"
                        }`}
                      >
                        {isFutureOrder(order)
                          ? "À venir"
                          : "Terminée"}
                      </span>

                      <strong>
                        {euro(order.total)}
                      </strong>

                    </div>
                  </div>
                </Link>
              ))}

          </div>

          {/* ACTIONS */}

          <div
  className="account-actions"
  style={{
    marginTop: "14px",
  }}
>

            <Link
              href="/commander"
              className="account-login-btn"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
              }}
            >
              <Utensils
                size={18}
                strokeWidth={1.8}
              />

              Commander
            </Link>

            {isAdmin && (
              <Link
                href="/admin"
                className="account-login-btn"
                style={{
                  background: "#5A7F0D",
                  color: "#ffffff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                }}
              >
                <Settings
                  size={18}
                  strokeWidth={1.8}
                />

                Administration
              </Link>
            )}

            <button
              type="button"
              className="account-create-btn"
              onClick={handleLogout}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
              }}
            >
              <LogOut
                size={18}
                strokeWidth={1.8}
              />

              Se déconnecter
            </button>

          </div>

          <div
            style={{
              marginTop: "24px",
              paddingTop: "16px",
              borderTop:
                "1px solid rgba(90, 127, 13, 0.18)",
              display: "flex",
              justifyContent: "center",
              gap: "16px",
              flexWrap: "wrap",
              fontSize: "11px",
            }}
          >
            <Link
              href="/mentions-legales"
              style={{
                color: "#5A7F0D",
                textDecoration: "none",
              }}
            >
              Mentions légales
            </Link>

            <Link
              href="/confidentialite"
              style={{
                color: "#5A7F0D",
                textDecoration: "none",
              }}
            >
              Politique de confidentialité
            </Link>
          </div>
        </div>

        {/* MODIFICATION DU PROFIL */}

        {profileOpen && (
          <div
            onClick={() => {
              if (!profileSaving) {
                setProfileOpen(false);
                setProfileMessage("");
              }
            }}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 5000,
              background: "rgba(0, 0, 0, 0.42)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "18px",
            }}
          >
            <div
              onClick={(event) =>
                event.stopPropagation()
              }
              style={{
                width: "100%",
                maxWidth: "430px",
                background: "#ffffff",
                borderRadius: "22px",
                padding: "20px",
                boxShadow:
                  "0 18px 50px rgba(0, 0, 0, 0.20)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "12px",
                  marginBottom: "18px",
                }}
              >
                <div>
                  <h2
                    style={{
                      margin: 0,
                      color: "#183D1F",
                      fontSize: "20px",
                    }}
                  >
                    Modifier mes informations
                  </h2>

                  <p
                    style={{
                      margin: "4px 0 0",
                      color: "#6B715F",
                      fontSize: "12px",
                    }}
                  >
                    Votre e-mail reste inchangé.
                  </p>
                </div>

                <button
                  type="button"
                  aria-label="Fermer"
                  disabled={profileSaving}
                  onClick={() => {
                    setProfileOpen(false);
                    setProfileMessage("");
                  }}
                  style={{
                    border: "none",
                    background: "transparent",
                    color: "#183D1F",
                    fontSize: "28px",
                    lineHeight: 1,
                    cursor: profileSaving
                      ? "not-allowed"
                      : "pointer",
                    opacity: profileSaving ? 0.5 : 1,
                  }}
                >
                  ×
                </button>
              </div>

              <label
                htmlFor="profile-first-name"
                style={{
                  display: "block",
                  marginBottom: "6px",
                  color: "#4F5548",
                  fontSize: "12px",
                  fontWeight: "700",
                }}
              >
                Prénom
              </label>

              <input
                id="profile-first-name"
                value={profileFirstName}
                onChange={(event) =>
                  setProfileFirstName(event.target.value)
                }
                autoComplete="given-name"
                style={{
                  width: "100%",
                  minHeight: "46px",
                  border: "1px solid #DDE4C7",
                  borderRadius: "12px",
                  padding: "0 12px",
                  marginBottom: "14px",
                  fontSize: "15px",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />

              <label
                htmlFor="profile-last-name"
                style={{
                  display: "block",
                  marginBottom: "6px",
                  color: "#4F5548",
                  fontSize: "12px",
                  fontWeight: "700",
                }}
              >
                Nom
              </label>

              <input
                id="profile-last-name"
                value={profileLastName}
                onChange={(event) =>
                  setProfileLastName(event.target.value)
                }
                autoComplete="family-name"
                style={{
                  width: "100%",
                  minHeight: "46px",
                  border: "1px solid #DDE4C7",
                  borderRadius: "12px",
                  padding: "0 12px",
                  marginBottom: "14px",
                  fontSize: "15px",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />

              <label
                htmlFor="profile-phone"
                style={{
                  display: "block",
                  marginBottom: "6px",
                  color: "#4F5548",
                  fontSize: "12px",
                  fontWeight: "700",
                }}
              >
                Téléphone
              </label>

              <input
                id="profile-phone"
                type="tel"
                value={profilePhone}
                onChange={(event) =>
                  setProfilePhone(event.target.value)
                }
                autoComplete="tel"
                style={{
                  width: "100%",
                  minHeight: "46px",
                  border: "1px solid #DDE4C7",
                  borderRadius: "12px",
                  padding: "0 12px",
                  marginBottom: "16px",
                  fontSize: "15px",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />

              {profileMessage && (
                <div
                  style={{
                    marginBottom: "14px",
                    padding: "10px 12px",
                    borderRadius: "10px",
                    background:
                      profileMessage.includes("bien été")
                        ? "#F4F8DF"
                        : "#FFF4E5",
                    color: "#4F5548",
                    fontSize: "12px",
                    lineHeight: 1.4,
                  }}
                >
                  {profileMessage}
                </div>
              )}

              <button
                type="button"
                onClick={saveProfile}
                disabled={profileSaving}
                style={{
                  width: "100%",
                  minHeight: "48px",
                  border: "none",
                  borderRadius: "14px",
                  background: "#98BD12",
                  color: "#ffffff",
                  fontSize: "14px",
                  fontWeight: "800",
                  cursor: profileSaving
                    ? "not-allowed"
                    : "pointer",
                  opacity: profileSaving ? 0.7 : 1,
                }}
              >
                {profileSaving
                  ? "Enregistrement…"
                  : "Enregistrer"}
              </button>
            </div>
          </div>
        )}
      </main>
    );
  }

  return (
    <main className="account-page">
      <div className="account-container">

        <h1>Mon compte</h1>

        <p className="account-intro">
          Connectez-vous ou créez votre compte So Fresh
        </p>

        <div className="account-actions">

          <Link
            href="/compte/connexion"
            className="account-login-btn"
          >
            Se connecter
          </Link>

          <Link
            href="/compte/inscription"
            className="account-create-btn"
          >
            Créer mon compte
          </Link>

        </div>

        <div className="account-benefits">

          <h2>Pourquoi créer un compte ?</h2>

          <div className="account-benefit">
            <span className="account-benefit-icon">
              <Star
                size={20}
                strokeWidth={1.8}
              />
            </span>

            <div>
              <strong>
                Profitez de votre fidélité
              </strong>

              <p>
                Retrouvez vos avantages fidélité.
              </p>
            </div>
          </div>

          <div className="account-benefit">
            <span className="account-benefit-icon">
              <Utensils
                size={20}
                strokeWidth={1.8}
              />
            </span>

            <div>
              <strong>
                Commandez plus rapidement
              </strong>

              <p>
                Retrouvez vos informations lors de vos
                prochaines commandes.
              </p>
            </div>
          </div>

          <div className="account-benefit">
            <span className="account-benefit-icon">
              <ReceiptText
                size={20}
                strokeWidth={1.8}
              />
            </span>

            <div>
              <strong>
                Retrouvez vos commandes
              </strong>

              <p>
                Consultez facilement votre historique.
              </p>
            </div>
          </div>

        </div>
      </div>

      <div
        style={{
          marginTop: "24px",
          paddingTop: "16px",
          borderTop:
            "1px solid rgba(90, 127, 13, 0.18)",
          display: "flex",
          justifyContent: "center",
          gap: "16px",
          flexWrap: "wrap",
          fontSize: "11px",
        }}
      >
        <Link
          href="/mentions-legales"
          style={{
            color: "#5A7F0D",
            textDecoration: "none",
          }}
        >
          Mentions légales
        </Link>

        <Link
          href="/confidentialite"
          style={{
            color: "#5A7F0D",
            textDecoration: "none",
          }}
        >
          Politique de confidentialité
        </Link>
      </div>
    </main>
  );
}