"use client";

import { useEffect, useMemo, useState } from "react";

import Link from "next/link";
import {
  ShoppingBag,
  ArrowRight,
} from "lucide-react";
import { useRouter } from "next/navigation";
import Cart from "../components/Cart";

import {
  isSupabaseConfigured,
  supabase,
} from "../../lib/supabase";

const euro = (value) =>
  Number(value || 0).toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
  });

const categoryAliases = {
  formule: "Formules",
  formules: "Formules",

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

  panini: "Paninis",
  paninis: "Paninis",

  club: "Clubs",
  clubs: "Clubs",

  taco: "Tacos",
  tacos: "Tacos",

  sandwich: "Sandwichs",
  sandwichs: "Sandwichs",

  bagel: "Bagels",
  bagels: "Bagels",

  boisson: "Boissons",
  boissons: "Boissons",

  dessert: "Desserts",
  desserts: "Desserts",
};

const categoryOrder = [
  "Formules",
  "Burgers",
  "Salades",
  "Wraps",
  "Pâtes",
  "Soupes",
  "Paninis",
  "Clubs",
  "Tacos",
  "Sandwichs",
  "Bagels",
  "Boissons",
  "Desserts",
];

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
  const cleanCategory = String(
    category || "Autres"
  ).trim();

  const key =
    cleanCategory.toLocaleLowerCase("fr-FR");

  return categoryAliases[key] || cleanCategory;
}

function parseTimeToMinutes(value) {
  const normalized = String(value || "")
    .trim()
    .replace(/\s*h\s*/i, ":");

  const match = normalized.match(
    /^(\d{1,2}):(\d{2})$/
  );

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
  const hours = Math.floor(
    totalMinutes / 60
  );

  const minutes = totalMinutes % 60;

  return `${String(hours).padStart(
    2,
    "0"
  )} h ${String(minutes).padStart(2, "0")}`;
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

  const interval = Number(
    settings.slot_interval
  );

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
  const parts =
    new Intl.DateTimeFormat("fr-FR", {
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
      parts.find(
        (part) => part.type === type
      )?.value || 0
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

  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

/* =========================================
   FERMETURE EXCEPTIONNELLE / CONGÉS
========================================= */

function isDateInsideClosure(
  isoDate,
  settings
) {
  if (!settings?.closure_enabled) {
    return false;
  }

  const start =
    settings.closure_start_date || "";

  const end =
    settings.closure_end_date || "";

  if (!start || !end || !isoDate) {
    return false;
  }

  return (
    isoDate >= start &&
    isoDate <= end
  );
}

function getParisTodayIso() {
  const now = parisNow();

  return `${now.year}-${String(
    now.month
  ).padStart(2, "0")}-${String(
    now.day
  ).padStart(2, "0")}`;
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

  return Boolean(
    openDays[date.getDay()]
  );
}

/* =========================================
   PROCHAINES DATES DE RETRAIT
========================================= */

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

  const todayIso = iso(today);

  if (
    isDateInsideClosure(
      todayIso,
      settings
    )
  ) {
    return [];
  }

  const cutoffMinutes =
    parseTimeToMinutes(
      settings.cutoff_time
    );

  const currentMinutes =
    now.hour * 60 + now.minute;

  const dates = [];

  const cursor =
    new Date(today);

  let checkedDays = 0;

  while (
    dates.length < 4 &&
    checkedDays < 90
  ) {
    const cursorIso =
      iso(cursor);

    const isToday =
      cursorIso === todayIso;

    const todayStillAvailable =
      !isToday ||
      cutoffMinutes === null ||
      currentMinutes < cutoffMinutes;

    const insideClosure =
      isDateInsideClosure(
        cursorIso,
        settings
      );

    if (
      isOpenDay(
        cursor,
        settings
      ) &&
      todayStillAvailable &&
      !insideClosure
    ) {
      dates.push(
        new Date(cursor)
      );
    }

    cursor.setDate(
      cursor.getDate() + 1
    );

    checkedDays += 1;
  }

  return dates;
}

function dateLabel(date) {
  const formattedDate =
    new Intl.DateTimeFormat("fr-FR", {
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

  const tomorrow =
    new Date(today);

  tomorrow.setDate(
    tomorrow.getDate() + 1
  );

  if (
    iso(date) === iso(today)
  ) {
    return `Aujourd’hui • ${formattedDate}`;
  }

  if (
    iso(date) === iso(tomorrow)
  ) {
    return `Demain • ${formattedDate}`;
  }

  return formattedDate;
}

function formatCutoffTime(value) {
  const minutes =
    parseTimeToMinutes(value);

  if (minutes === null) {
    return value || "";
  }

  const hours =
    Math.floor(minutes / 60);

  const remainingMinutes =
    minutes % 60;

  if (
    remainingMinutes === 0
  ) {
    return `${hours} h`;
  }

  return `${hours} h ${String(
    remainingMinutes
  ).padStart(2, "0")}`;
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
    .map((isOpen, index) =>
      isOpen ? index : null
    )
    .filter(
      (value) => value !== null
    );

  if (
    openDays.length === 7
  ) {
    return "Tous les jours";
  }

  if (
    openDays.length === 5 &&
    openDays.join(",") ===
      "1,2,3,4,5"
  ) {
    return "Du lundi au vendredi";
  }

  return openDays
    .map(
      (day) => dayLabels[day]
    )
    .join(", ");
}

export default function Home() {
  const router = useRouter();

  const [products, setProducts] = useState([]);
  const [settings, setSettings] = useState(null);

  const [category, setCategory] = useState(null);
  const [cart, setCart] = useState({});
  const [cartLoaded, setCartLoaded] = useState(false);
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

  useEffect(() => {
    async function checkAccess() {
      if (!isSupabaseConfigured || !supabase) {
        router.replace("/acces-commande");
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || !user.email_confirmed_at) {
        router.replace("/acces-commande");
      }
    }

    checkAccess();
  }, [router]);

  /* =========================================
     ANCIEN RETRAIT MÉMORISÉ
  ========================================= */

  useEffect(() => {
    const savedDate = localStorage.getItem(
      "sofresh_pickup_date"
    );

    const savedTime = localStorage.getItem(
      "sofresh_pickup_time"
    );

    if (!savedDate || !savedTime) return;

    const nowParts =
      new Intl.DateTimeFormat("fr-FR", {
        timeZone: "Europe/Paris",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).formatToParts(new Date());

    const get = (type) =>
      nowParts.find(
        (part) => part.type === type
      )?.value;

    const today =
      `${get("year")}-${get("month")}-${get("day")}`;

    const currentMinutes =
      Number(get("hour")) * 60 +
      Number(get("minute"));

    const savedMinutes =
      parseTimeToMinutes(savedTime);

    const dateIsPast =
      savedDate < today;

    const timeIsPastToday =
      savedDate === today &&
      savedMinutes !== null &&
      savedMinutes <= currentMinutes;

    if (
      dateIsPast ||
      timeIsPastToday
    ) {
      localStorage.removeItem(
        "sofresh_pickup_date"
      );

      localStorage.removeItem(
        "sofresh_pickup_time"
      );

      setPickupDate("");
      setPickupTime("");

      return;
    }

    setPickupDate(savedDate);
    setPickupTime(savedTime);
  }, []);

  /* =========================================
     PANIER
  ========================================= */

  useEffect(() => {
    const savedCart =
      localStorage.getItem(
        "sofresh_cart"
      );

    if (savedCart) {
      try {
        setCart(
          JSON.parse(savedCart)
        );
      } catch (error) {
        console.error(
          "Erreur lecture panier :",
          error
        );
      }
    }

    setCartLoaded(true);
  }, []);

  useEffect(() => {
    if (!cartLoaded) return;

    localStorage.setItem(
      "sofresh_cart",
      JSON.stringify(cart)
    );
  }, [cart, cartLoaded]);

  /* =========================================
     HORAIRES
  ========================================= */

  const pickupTimes = useMemo(
    () =>
      generatePickupTimes(
        settings
      ),
    [settings]
  );

  /* =========================================
     CHARGEMENT DES PARAMÈTRES
  ========================================= */

  useEffect(() => {
    async function loadSettings() {
      setLoadingSettings(true);

      try {
        const response =
          await fetch(
            "/api/settings",
            {
              cache: "no-store",
            }
          );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.error ||
              "Impossible de charger les paramètres."
          );
        }

        setSettings(data);
      } catch (error) {
        console.error(
          "Erreur paramètres :",
          error
        );

        setMessage(
          "Les horaires du Click & Collect sont indisponibles."
        );
      } finally {
        setLoadingSettings(false);
      }
    }

    loadSettings();
  }, []);

  /* =========================================
     ÉTAT DE FERMETURE
  ========================================= */

  const closureActiveToday =
    isDateInsideClosure(
      getParisTodayIso(),
      settings
    );

  const serviceOpen =
    Boolean(
      settings?.restaurant_open
    ) &&
    !closureActiveToday;

  const closureMessage =
    settings?.closure_message ||
    "So Fresh est fermé pour congés. À très bientôt !";

  useEffect(() => {
    if (!settings) return;

    if (closureActiveToday) {
      localStorage.removeItem(
        "sofresh_pickup_date"
      );

      localStorage.removeItem(
        "sofresh_pickup_time"
      );

      setPickupDate("");
      setPickupTime("");
    }
  }, [
    settings,
    closureActiveToday,
  ]);

  /* =========================================
     DATES DISPONIBLES
  ========================================= */

  const dates = useMemo(
    () =>
      getPickupDates(
        settings
      ),
    [settings]
  );

  useEffect(() => {
    if (
      dates.length === 0
    ) {
      setPickupDate("");
      return;
    }

    const savedDate =
      localStorage.getItem(
        "sofresh_pickup_date"
      );

    if (
      savedDate &&
      dates.some(
        (date) =>
          iso(date) === savedDate
      )
    ) {
      setPickupDate(savedDate);
      return;
    }

    const dateStillAvailable =
      dates.some(
        (date) =>
          iso(date) ===
          pickupDate
      );

    if (!dateStillAvailable) {
      setPickupDate(
        iso(dates[0])
      );
    }
  }, [dates, pickupDate]);

  /* =========================================
     HEURE DE RETRAIT
  ========================================= */

  useEffect(() => {
    if (
      pickupTimes.length === 0 ||
      closureActiveToday
    ) {
      setPickupTime("");
      return;
    }

    const savedTime =
      localStorage.getItem(
        "sofresh_pickup_time"
      );

    if (
      savedTime &&
      pickupTimes.includes(
        savedTime
      )
    ) {
      setPickupTime(savedTime);
      return;
    }

    if (
      !pickupTimes.includes(
        pickupTime
      )
    ) {
      setPickupTime(
        pickupTimes[0]
      );
    }
  }, [
    pickupTimes,
    pickupTime,
    closureActiveToday,
  ]);

  /* =========================================
     DISPONIBILITÉ DES CRÉNEAUX
  ========================================= */

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
        const response =
          await fetch(
            `/api/availability?date=${pickupDate}`,
            {
              cache: "no-store",
            }
          );

        if (!response.ok) {
          return;
        }

        const data =
          await response.json();

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

  /* =========================================
     CLIENT
  ========================================= */

  useEffect(() => {
    async function loadCustomer() {
      if (!supabase) return;

      const {
        data: { user },
      } =
        await supabase.auth.getUser();

      if (user) {
        const firstName =
          user.user_metadata
            ?.first_name || "";

        const lastName =
          user.user_metadata
            ?.last_name || "";

        const phone =
          user.user_metadata
            ?.phone || "";

        const fullName =
          `${firstName} ${lastName}`.trim();

        setCustomerName(
          fullName
        );

        setCustomerPhone(
          phone
        );

        localStorage.setItem(
          "sofresh_customer_name",
          fullName
        );

        localStorage.setItem(
          "sofresh_customer_phone",
          phone
        );
      } else {
        setCustomerName(
          localStorage.getItem(
            "sofresh_customer_name"
          ) || ""
        );

        setCustomerPhone(
          localStorage.getItem(
            "sofresh_customer_phone"
          ) || ""
        );
      }
    }

    loadCustomer();
  }, []);

  /* =========================================
     PRODUITS
  ========================================= */

  useEffect(() => {
    async function loadProducts() {
      setLoadingProducts(true);

      if (
        !isSupabaseConfigured
      ) {
        setMessage(
          "Supabase n’est pas configuré."
        );

        setLoadingProducts(false);
        return;
      }

      const {
        data,
        error,
      } = await supabase
        .from("products")
        .select("*")
        .eq("available", true)
        .order(
          "display_order",
          {
            ascending: true,
          }
        )
        .order("name", {
          ascending: true,
        });

      if (error) {
        console.error(
          "Erreur produits :",
          error
        );

        setMessage(
          "Le menu n’a pas pu être chargé."
        );

        setLoadingProducts(false);
        return;
      }

      const normalizedProducts =
        (data || []).map(
          (product) => ({
            ...product,

            normalized_category:
              normalizeCategory(
                product.category
              ),
          })
        );

      setProducts(
        normalizedProducts
      );

      setLoadingProducts(false);
    }

    loadProducts();
  }, []);
    /* =========================================
     CATÉGORIES
  ========================================= */

  const categories = useMemo(() => {
    const productCategories =
      products
        .map(
          (product) =>
            product.normalized_category
        )
        .filter(Boolean);

    return [
      "Tout",
      ...new Set(
        productCategories
      ),
    ];
  }, [products]);

  const visibleProducts =
    useMemo(() => {
      if (
        category === "Tout"
      ) {
        return products;
      }

      return products.filter(
        (product) =>
          product.normalized_category ===
          category
      );
    }, [
      products,
      category,
    ]);

  /* =========================================
     PANIER : TOTAL ET QUANTITÉ
  ========================================= */

  const cartCount =
    Object.values(
      cart
    ).reduce(
      (sum, quantity) =>
        sum + quantity,
      0
    );

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent(
        "sofresh-cart-count",
        {
          detail: cartCount,
        }
      )
    );
  }, [cartCount]);

  useEffect(() => {
    const openCart = () => {
      setCartOpen(true);
    };

    window.addEventListener(
      "sofresh-open-cart",
      openCart
    );

    return () => {
      window.removeEventListener(
        "sofresh-open-cart",
        openCart
      );
    };
  }, []);

  const cartTotal =
    Object.entries(
      cart
    ).reduce(
      (
        sum,
        [id, quantity]
      ) => {
        const product =
          products.find(
            (
              currentProduct
            ) =>
              String(
                currentProduct.id
              ) ===
              String(id)
          );

        if (!product) {
          return sum;
        }

        return (
          sum +
          Number(
            product.price
          ) *
            quantity
        );
      },
      0
    );

  /* =========================================
     AJOUT / SUPPRESSION PRODUITS
  ========================================= */

  function addProduct(
    productId
  ) {
    setCart(
      (current) => ({
        ...current,

        [productId]:
          (current[
            productId
          ] || 0) + 1,
      })
    );
  }

  function changeQuantity(
    productId,
    difference
  ) {
    setCart(
      (current) => {
        const nextCart = {
          ...current,

          [productId]:
            (current[
              productId
            ] || 0) +
            difference,
        };

        if (
          nextCart[
            productId
          ] <= 0
        ) {
          delete nextCart[
            productId
          ];
        }

        return nextCart;
      }
    );
  }

  /* =========================================
     VALIDATION / PAIEMENT
  ========================================= */

  async function submitOrder() {
    setMessage("");

    if (!settings) {
      setMessage(
        "Les réglages du Click & Collect ne sont pas disponibles."
      );

      return;
    }

    if (
      closureActiveToday
    ) {
      setMessage(
        closureMessage
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
      setMessage(
        "Ajoutez au moins un produit."
      );

      return;
    }

    if (!pickupDate) {
      setMessage(
        "Aucune date de retrait n’est disponible."
      );

      return;
    }

    if (
      isDateInsideClosure(
        pickupDate,
        settings
      )
    ) {
      setMessage(
        "Cette date de retrait n’est pas disponible pendant la fermeture exceptionnelle."
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

    const items =
      Object.entries(
        cart
      ).map(
        ([
          id,
          quantity,
        ]) => ({
          id: Number(id),
          qty: quantity,
        })
      );

    setPaymentLoading(true);

    try {
      const {
        data: { session },
      } =
        await supabase.auth.getSession();

      const response =
        await fetch(
          "/api/create-checkout-session",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",

              ...(session?.access_token
                ? {
                    Authorization:
                      `Bearer ${session.access_token}`,
                  }
                : {}),
            },

            body: JSON.stringify({
              customer_name:
                customerName.trim(),

              customer_phone:
                customerPhone.trim(),

              pickup_date:
                pickupDate,

              pickup_time:
                pickupTime,

              items,
            }),
          }
        );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data.url
      ) {
        setMessage(
          data.error ||
            "Le paiement n’a pas pu être initialisé."
        );

        setPaymentLoading(false);

        return;
      }

      window.location.href =
        data.url;
    } catch (error) {
      console.error(
        "Erreur paiement :",
        error
      );

      setMessage(
        "Le paiement n’a pas pu être initialisé."
      );

      setPaymentLoading(false);
    }
  }

  return (
    <>
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

        {category === null ? (
          <section className="category-family-grid">
            {categoryOrder.map((currentCategory) => (
              <button
                type="button"
                key={currentCategory}
                className="category-family-card"
                onClick={() =>
                  setCategory(currentCategory)
                }
              >
                <div className="category-family-image">
                  <img
                    src={`/cat-${currentCategory
                      .toLowerCase()
                      .normalize("NFD")
                      .replace(
                        /[\u0300-\u036f]/g,
                        ""
                      )}.png`}
                    alt={currentCategory}
                  />
                </div>

                <div className="category-family-name">
                  {currentCategory}
                </div>
              </button>
            ))}
          </section>
        ) : (
          <div className="category-nav">
            {categoryOrder.map((currentCategory) => (
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
        )}

        {category !== null && (
          <>
            {loadingProducts && (
              <div className="empty">
                Chargement du menu…
              </div>
            )}

            {!loadingProducts && (
              <section className="product-list-mobile">
                {visibleProducts.map((product) => {
                  const productQuantity =
                    cart[product.id] || 0;

                  return (
                    <article
                      className="product-row-card"
                      key={product.id}
                    >
                      <div className="product-row-image">
                        {product.image_url ? (
                          <img
                            src={product.image_url}
                            alt={product.name}
                          />
                        ) : (
                          <img
                            src={`/cat-${category
                              .toLowerCase()
                              .normalize("NFD")
                              .replace(
                                /[\u0300-\u036f]/g,
                                ""
                              )}.png`}
                            alt={product.name}
                          />
                        )}
                      </div>

                      <div
                        className="product-row-content"
                        style={{
                          position: "relative",
                          paddingRight: "92px",
                        }}
                      >
                        <h3>
                          {product.name}
                        </h3>

                        <p
                          style={{
                            whiteSpace: "pre-line",
                          }}
                        >
                          {product.description ||
                            "Préparé avec soin par So Fresh."}
                        </p>

                        <div
                          style={{
                            position: "absolute",
                            top: "10px",
                            right: "10px",
                            width: "68px",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: "8px",
                          }}
                        >
                          <div
                            style={{
                              width: "68px",
                              height: "34px",
                              borderRadius: "10px",
                              background: "#98BD12",
                              color: "#ffffff",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              padding: "0 5px",
                              fontSize: "15px",
                              fontWeight: "800",
                              lineHeight: "1",
                              whiteSpace: "nowrap",
                              boxShadow:
                                "0 3px 8px rgba(90,127,13,0.15)",
                            }}
                          >
                            {euro(product.price)}
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              addProduct(product.id)
                            }
                            aria-label={`Ajouter ${product.name} au panier`}
                            style={{
                              position: "relative",
                              width: "60px",
                              height: "56px",
                              minWidth: "60px",
                              border: "none",
                              borderRadius: "13px",
                              background: "#5A7F0D",
                              color: "#ffffff",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              cursor: "pointer",
                              boxShadow:
                                "0 5px 12px rgba(90,127,13,0.23)",
                              overflow: "visible",
                            }}
                          >
                            <svg
                              width="29"
                              height="29"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.9"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden="true"
                              style={{
                                transform:
                                  "translateX(-5px)",
                              }}
                            >
                              <circle
                                cx="9"
                                cy="20"
                                r="1"
                              />

                              <circle
                                cx="19"
                                cy="20"
                                r="1"
                              />

                              <path d="M3 4h2l2.4 10.2a2 2 0 0 0 2 1.6h7.8a2 2 0 0 0 2-1.6L21 8H6" />
                            </svg>

                            <span
                              style={{
                                position: "absolute",
                                top: "-5px",
                                right: "-5px",
                                width: "22px",
                                height: "22px",
                                borderRadius: "50%",
                                background: "#98BD12",
                                color: "#ffffff",
                                border:
                                  "2px solid #ffffff",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "17px",
                                fontWeight: "900",
                                lineHeight: "1",
                                pointerEvents: "none",
                              }}
                            >
                              +
                            </span>

                            {productQuantity > 0 && (
                              <span
                                style={{
                                  position: "absolute",
                                  right: "2px",
                                  bottom: "2px",
                                  minWidth: "23px",
                                  height: "23px",
                                  padding: "0 4px",
                                  borderRadius: "999px",
                                  background: "#ffffff",
                                  color: "#5A7F0D",
                                  border:
                                    "2px solid #ffffff",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontSize: "12px",
                                  fontWeight: "900",
                                  lineHeight: "1",
                                  boxShadow:
                                    "0 2px 5px rgba(0,0,0,0.15)",
                                  pointerEvents: "none",
                                }}
                              >
                                {productQuantity}
                              </span>
                            )}
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </section>
            )}

            {!loadingProducts &&
              visibleProducts.length === 0 && (
                <div className="empty">
                  Aucun produit disponible dans cette
                  catégorie.
                </div>
              )}
          </>
        )}

        {/* BOUTON PANIER COMPACT */}

        {cartCount > 0 && (
          <Link
            href="/panier"
            style={{
              width: "100%",
              minHeight: "56px",
              marginTop: "18px",
              marginBottom: "22px",
              padding: "9px 15px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "12px",
              background: "#5A7F0D",
              color: "#ffffff",
              borderRadius: "14px",
              textDecoration: "none",
              boxShadow:
                "0 6px 16px rgba(90, 127, 13, 0.20)",
              boxSizing: "border-box",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
              }}
            >
              <div
                style={{
                  position: "relative",
                  width: "32px",
                  height: "32px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <ShoppingBag
                  size={25}
                  strokeWidth={1.8}
                />

                <span
                  style={{
                    position: "absolute",
                    top: "-7px",
                    right: "-7px",
                    minWidth: "19px",
                    height: "19px",
                    padding: "0 4px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: "999px",
                    background: "#FFD400",
                    color: "#5A7F0D",
                    border: "2px solid #ffffff",
                    fontSize: "10px",
                    fontWeight: "800",
                    boxSizing: "border-box",
                  }}
                >
                  {cartCount}
                </span>
              </div>

              <div>
                <strong
                  style={{
                    display: "block",
                    fontSize: "14px",
                    lineHeight: 1.15,
                  }}
                >
                  Voir mon panier
                </strong>

                <span
                  style={{
                    display: "block",
                    marginTop: "3px",
                    fontSize: "11px",
                    lineHeight: 1.15,
                    opacity: 0.9,
                  }}
                >
                  {cartCount}{" "}
                  {cartCount > 1
                    ? "articles"
                    : "article"}{" "}
                  · {euro(cartTotal)}
                </span>
              </div>
            </div>

            <ArrowRight
              size={21}
              strokeWidth={1.8}
            />
          </Link>
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