"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import Cart from "./components/Cart";
import {
  isSupabaseConfigured,
  supabase,
} from "../lib/supabase";

const euro = (value) =>
  Number(value || 0).toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
  });

const categoryAliases = {
  burger: "Burgers",
  burgers: "Burgers",
  salade: "Salades",
  salades: "Salades",
  wrap: "Wraps",
  wraps: "Wraps",
  pâte: "Pâtes",
  pâtes: "Pâtes",
  pate: "Pâtes",
  pates: "Pâtes",
  soupe: "Soupes",
  soupes: "Soupes",
  boisson: "Boissons",
  boissons: "Boissons",
  dessert: "Desserts",
  desserts: "Desserts",
};

const dayLabels = {
  0: "Dimanche",
  1: "Lundi",
  2: "Mardi",
  3: "Mercredi",
  4: "Jeudi",
  5: "Vendredi",
  6: "Samedi",
};

function normalizeCategory(category) {
  const cleanCategory = String(category || "Autres").trim();
  const key = cleanCategory.toLocaleLowerCase("fr-FR");

  return categoryAliases[key] || cleanCategory;
}

function parseTimeToMinutes(value) {
  const normalized = String(value || "")
    .trim()
    .replace(/\s*h\s*/i, ":");

  const match = normalized.match(/^(\d{1,2}):(\d{2})$/);

  if (!match) {
    return null;
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  if (
    !Number.isInteger(hours) ||
    !Number.isInteger(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }

  return hours * 60 + minutes;
}

function formatPickupTime(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return `${String(hours).padStart(2, "0")} h ${String(
    minutes
  ).padStart(2, "0")}`;
}

function generatePickupTimes(settings) {
  if (!settings) {
    return [];
  }

  const firstMinutes = parseTimeToMinutes(
    settings.first_pickup_time
  );

  const lastMinutes = parseTimeToMinutes(
    settings.last_pickup_time
  );

  const interval = Number(settings.slot_interval);

  if (
    firstMinutes === null ||
    lastMinutes === null ||
    !Number.isInteger(interval) ||
    interval < 1 ||
    firstMinutes > lastMinutes
  ) {
    return [];
  }

  const times = [];

  for (
    let current = firstMinutes;
    current <= lastMinutes;
    current += interval
  ) {
    times.push(formatPickupTime(current));
  }

  return times;
}

function parisNow() {
  const parts = new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());

  const get = (type) =>
    Number(
      parts.find((part) => part.type === type)?.value || 0
    );

  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
  };
}

function iso(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function isOpenDay(date, settings) {
  if (!settings) {
    return false;
  }

  const openDays = {
    0: settings.open_sunday,
    1: settings.open_monday,
    2: settings.open_tuesday,
    3: settings.open_wednesday,
    4: settings.open_thursday,
    5: settings.open_friday,
    6: settings.open_saturday,
  };

  return Boolean(openDays[date.getDay()]);
}

function getPickupDates(settings) {
  if (!settings) {
    return [];
  }

  const now = parisNow();

  const today = new Date(
    now.year,
    now.month - 1,
    now.day,
    12,
    0,
    0
  );

  const cutoffMinutes = parseTimeToMinutes(
    settings.cutoff_time
  );

  const currentMinutes = now.hour * 60 + now.minute;

  const dates = [];
  const cursor = new Date(today);

  let checkedDays = 0;

  while (dates.length < 4 && checkedDays < 31) {
    const isToday = iso(cursor) === iso(today);

    const todayStillAvailable =
      !isToday ||
      cutoffMinutes === null ||
      currentMinutes < cutoffMinutes;

    if (
      isOpenDay(cursor, settings) &&
      todayStillAvailable
    ) {
      dates.push(new Date(cursor));
    }

    cursor.setDate(cursor.getDate() + 1);
    checkedDays += 1;
  }

  return dates;
}

function dateLabel(date) {
  const formattedDate = new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(date);

  const now = parisNow();

  const today = new Date(
    now.year,
    now.month - 1,
    now.day,
    12,
    0,
    0
  );

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (iso(date) === iso(today)) {
    return `Aujourd’hui • ${formattedDate}`;
  }

  if (iso(date) === iso(tomorrow)) {
    return `Demain • ${formattedDate}`;
  }

  return formattedDate;
}

function formatCutoffTime(value) {
  const minutes = parseTimeToMinutes(value);

  if (minutes === null) {
    return value || "";
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (remainingMinutes === 0) {
    return `${hours} h`;
  }

  return `${hours} h ${String(remainingMinutes).padStart(
    2,
    "0"
  )}`;
}

function getOpenDaysText(settings) {
  if (!settings) {
    return "";
  }

  const openValues = [
    settings.open_sunday,
    settings.open_monday,
    settings.open_tuesday,
    settings.open_wednesday,
    settings.open_thursday,
    settings.open_friday,
    settings.open_saturday,
  ];

  const openDays = openValues
    .map((isOpen, index) => (isOpen ? index : null))
    .filter((value) => value !== null);

  if (openDays.length === 7) {
    return "Tous les jours";
  }

  if (
    openDays.length === 5 &&
    openDays.join(",") === "1,2,3,4,5"
  ) {
    return "Du lundi au vendredi";
  }

  return openDays
    .map((day) => dayLabels[day])
    .join(", ");
}

export default function Home() {
  const [products, setProducts] = useState([]);
  const [settings, setSettings] = useState(null);

  const [category, setCategory] = useState("Tout");
  const [cart, setCart] = useState({});
  const [cartOpen, setCartOpen] = useState(false);

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  const [pickupDate, setPickupDate] = useState("");
  const [pickupTime, setPickupTime] = useState("");

  const [message, setMessage] = useState("");

  const [loadingProducts, setLoadingProducts] =
    useState(true);

  const [loadingSettings, setLoadingSettings] =
    useState(true);

  const [paymentLoading, setPaymentLoading] =
    useState(false);
  const [availability, setAvailability] = useState({
    capacity: 0,
    counts: {},
  });

  const pickupTimes = useMemo(
    () => generatePickupTimes(settings),
    [settings]
  );

  useEffect(() => {
    if (!pickupDate) {
      setAvailability({
        capacity: 0,
        counts: {},
      });

      return;
    }

    async function loadAvailability() {
      try {
        const response = await fetch(
          `/api/availability?date=${pickupDate}`,
          {
            cache: "no-store",
          }
        );

        if (!response.ok) {
          return;
        }

        const data = await response.json();

        setAvailability(data);
      } catch (error) {
        console.error(
          "Erreur disponibilité des créneaux :",
          error
        );
      }
    }

    loadAvailability();
  }, [pickupDate]);

  const dates = useMemo(
    () => getPickupDates(settings),
    [settings]
  );

  useEffect(() => {
    setCustomerName(
      localStorage.getItem("sofresh_customer_name") || ""
    );

    setCustomerPhone(
      localStorage.getItem("sofresh_customer_phone") ||
        ""
    );
  }, []);

  useEffect(() => {
    async function loadSettings() {
      setLoadingSettings(true);

      try {
        const response = await fetch("/api/settings", {
          cache: "no-store",
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.error ||
              "Impossible de charger les paramètres."
          );
        }

        setSettings(data);
      } catch (error) {
        console.error("Erreur paramètres :", error);

        setMessage(
          "Les horaires du Click & Collect sont indisponibles."
        );
      } finally {
        setLoadingSettings(false);
      }
    }

    loadSettings();
  }, []);

  useEffect(() => {
    if (dates.length === 0) {
      setPickupDate("");
      return;
    }

    const dateStillAvailable = dates.some(
      (date) => iso(date) === pickupDate
    );

    if (!dateStillAvailable) {
      setPickupDate(iso(dates[0]));
    }
  }, [dates, pickupDate]);

  useEffect(() => {
    if (pickupTimes.length === 0) {
      setPickupTime("");
      return;
    }

    if (!pickupTimes.includes(pickupTime)) {
      setPickupTime(pickupTimes[0]);
    }
  }, [pickupTimes, pickupTime]);

  useEffect(() => {
    async function loadProducts() {
      setLoadingProducts(true);

      if (!isSupabaseConfigured) {
        setMessage("Supabase n’est pas configuré.");
        setLoadingProducts(false);
        return;
      }

      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("available", true)
        .order("display_order", { ascending: true })
        .order("name", { ascending: true });

      if (error) {
        console.error("Erreur produits :", error);

        setMessage("Le menu n’a pas pu être chargé.");
        setLoadingProducts(false);
        return;
      }

      const normalizedProducts = (data || []).map(
        (product) => ({
          ...product,
          normalized_category: normalizeCategory(
            product.category
          ),
        })
      );

      setProducts(normalizedProducts);
      setLoadingProducts(false);
    }

    loadProducts();
  }, []);

  const categories = useMemo(() => {
    const productCategories = products
      .map((product) => product.normalized_category)
      .filter(Boolean);

    return ["Tout", ...new Set(productCategories)];
  }, [products]);

  const visibleProducts = useMemo(() => {
    if (category === "Tout") {
      return products;
    }

    return products.filter(
      (product) =>
        product.normalized_category === category
    );
  }, [products, category]);

  const cartCount = Object.values(cart).reduce(
    (sum, quantity) => sum + quantity,
    0
  );

  const cartTotal = Object.entries(cart).reduce(
    (sum, [id, quantity]) => {
      const product = products.find(
        (currentProduct) =>
          String(currentProduct.id) === String(id)
      );

      if (!product) {
        return sum;
      }

      return sum + Number(product.price) * quantity;
    },
    0
  );

  const serviceOpen = Boolean(
    settings?.restaurant_open
  );

  function addProduct(productId) {
    setCart((current) => ({
      ...current,
      [productId]: (current[productId] || 0) + 1,
    }));
  }

  function changeQuantity(productId, difference) {
    setCart((current) => {
      const nextCart = {
        ...current,
        [productId]:
          (current[productId] || 0) + difference,
      };

      if (nextCart[productId] <= 0) {
        delete nextCart[productId];
      }

      return nextCart;
    });
  }

  async function submitOrder() {
    setMessage("");

    if (!settings) {
      setMessage(
        "Les réglages du Click & Collect ne sont pas disponibles."
      );
      return;
    }

    if (!serviceOpen) {
      setMessage(
        "Le Click & Collect est actuellement fermé."
      );
      return;
    }

    if (cartCount === 0) {
      setMessage("Ajoutez au moins un produit.");
      return;
    }

    if (!pickupDate) {
      setMessage(
        "Aucune date de retrait n’est disponible."
      );
      return;
    }

    if (!pickupTime) {
      setMessage(
        "Aucun créneau de retrait n’est disponible."
      );
      return;
    }

    if (
      !customerName.trim() ||
      !customerPhone.trim()
    ) {
      setMessage(
        "Indiquez votre nom et votre numéro de téléphone."
      );
      return;
    }

    localStorage.setItem(
      "sofresh_customer_name",
      customerName.trim()
    );

    localStorage.setItem(
      "sofresh_customer_phone",
      customerPhone.trim()
    );

    const items = Object.entries(cart).map(
      ([id, quantity]) => ({
        id: Number(id),
        qty: quantity,
      })
    );

    setPaymentLoading(true);

    try {
      const response = await fetch(
        "/api/create-checkout-session",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            customer_name: customerName.trim(),
            customer_phone: customerPhone.trim(),
            pickup_date: pickupDate,
            pickup_time: pickupTime,
            items,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.url) {
        setMessage(
          data.error ||
            "Le paiement n’a pas pu être initialisé."
        );

        setPaymentLoading(false);
        return;
      }

      window.location.href = data.url;
    } catch (error) {
      console.error("Erreur paiement :", error);

      setMessage(
        "Le paiement n’a pas pu être initialisé."
      );

      setPaymentLoading(false);
    }
  }

  return (
    <>
      <header
        className="topbar"
        style={{
          justifyContent: "space-between",
          minHeight: "92px",
          paddingInline: "clamp(18px, 4vw, 60px)",
        }}
      >
        <Image
          src="/logo-sofresh.png"
          alt="So Fresh Salade"
          width={500}
          height={190}
          priority
          style={{
            width: "240px",
            maxWidth: "58vw",
            height: "auto",
            objectFit: "contain",
          }}
        />

        <button
          type="button"
          className="cart-button"
          onClick={() => setCartOpen(true)}
        >
          Panier · {cartCount}
        </button>
      </header>

      <section
        className="hero"
        style={{
          background: "#fbfbf9",
          borderBottom: "1px solid var(--line)",
        }}
      >
        <div className="hero-inner">
          <div className="eyebrow">
            CLICK &amp; COLLECT
          </div>

          <h1>
            Frais, rapide,
            <br />
            prêt pour midi.
          </h1>

          <p>
            Commandez en ligne et récupérez votre repas
            chez So Fresh.
          </p>

          {!loadingSettings && settings && (
            <div
              style={{
                width: "fit-content",
                marginTop: "20px",
                padding: "10px 16px",
                border: "1px solid var(--line)",
                borderRadius: "999px",
                background: "#ffffff",
                fontWeight: 500,
              }}
            >
              {serviceOpen
                ? `${getOpenDaysText(
                    settings
                  )} · jusqu’à ${formatCutoffTime(
                    settings.cutoff_time
                  )}`
                : "Click & Collect actuellement fermé"}
            </div>
          )}
        </div>
      </section>

      <main className="container">
        {!loadingSettings &&
          settings &&
          !serviceOpen && (
            <div
              className="message"
              style={{
                marginBottom: "22px",
                textAlign: "center",
              }}
            >
              Le Click & Collect est actuellement fermé.
              Vous pouvez consulter le menu, mais pas
              valider de commande.
            </div>
          )}

        <div className="categories">
          {categories.map((currentCategory) => (
            <button
              type="button"
              key={currentCategory}
              className={`chip ${
                currentCategory === category
                  ? "active"
                  : ""
              }`}
              onClick={() =>
                setCategory(currentCategory)
              }
            >
              {currentCategory}
            </button>
          ))}
        </div>

        {loadingProducts && (
          <div className="empty">
            Chargement du menu…
          </div>
        )}

        {!loadingProducts && (
          <section className="grid">
            {visibleProducts.map((product) => (
              <article
                className="card"
                key={product.id}
              >
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
                      display: "inline-block",
                      marginBottom: "8px",
                      color: "var(--green-dark)",
                      fontSize: "0.78rem",
                      fontWeight: 600,
                      textTransform: "uppercase",
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
                      onClick={() =>
                        addProduct(product.id)
                      }
                    >
                      Ajouter
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </section>
        )}

        {!loadingProducts &&
          visibleProducts.length === 0 && (
            <div className="empty">
              Aucun produit disponible dans cette
              catégorie.
            </div>
          )}
      </main>

      <Cart
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        cart={cart}
        products={products}
        cartCount={cartCount}
        cartTotal={cartTotal}
        changeQuantity={changeQuantity}
        loadingSettings={loadingSettings}
        dates={dates}
        pickupDate={pickupDate}
        setPickupDate={setPickupDate}
        dateLabel={dateLabel}
        iso={iso}
        pickupTimes={pickupTimes}
        pickupTime={pickupTime}
        setPickupTime={setPickupTime}
        availability={availability}
        customerName={customerName}
        setCustomerName={setCustomerName}
        customerPhone={customerPhone}
        setCustomerPhone={setCustomerPhone}
        paymentLoading={paymentLoading}
        serviceOpen={serviceOpen}
        submitOrder={submitOrder}
        message={message}
      />

      <div className="admin-link">
        <Link href="/login">
          Administration
        </Link>
      </div>
    </>
  );
}

