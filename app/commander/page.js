"use client";

import { useEffect, useMemo, useState } from "react";

import Link from "next/link";
import {
  ShoppingBag,
  ArrowRight,
} from "lucide-react";
import { useRouter } from "next/navigation";
import Cart from "../components/Cart";
import styles from "./commander.module.css";

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

  "maxi salade": "Maxi Salades",
  "maxi salades": "Maxi Salades",

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

  "pause sucrée / salée": "Pause sucrée / salée",
  "pause sucree / salee": "Pause sucrée / salée",
  "pause sucrée/salée": "Pause sucrée / salée",
  "pause sucree/salee": "Pause sucrée / salée",
};

const categoryOrder = [
  "Formules",
  "Burgers",
  "Salades",
  "Maxi Salades",
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
  "Pause sucrée / salée",
];

function getCategoryImage(category) {
  if (category === "Pause sucrée / salée") {
    return "/cat-pause-sucree-salee.png";
  }

  if (category === "Maxi Salades") {
    return "/cat-maxi-salades.png";
  }

  return `/cat-${category
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")}.png`;
}

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

  // =========================================
  // COMPOSITION DES FORMULES
  // =========================================
  const [formulaOpen, setFormulaOpen] = useState(false);
  const [formulaProduct, setFormulaProduct] = useState(null);
  const [formulaSteps, setFormulaSteps] = useState([]);
  const [formulaChoices, setFormulaChoices] = useState({});
  const [formulaLoading, setFormulaLoading] = useState(false);
  const [formulaError, setFormulaError] = useState("");

  /* =========================================
     CATÉGORIE DEMANDÉE DEPUIS L'ACCUEIL
  ========================================= */

  useEffect(() => {
    const requestedCategory =
      new URLSearchParams(window.location.search).get("categorie");

    if (!requestedCategory) return;

    const normalizedCategory =
      normalizeCategory(requestedCategory);

    if (categoryOrder.includes(normalizedCategory)) {
      setCategory(normalizedCategory);
    }
  }, []);

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
     FORMULES : CHOIX CLIENT
  ========================================= */

  async function openFormula(product) {
    setFormulaProduct(product);
    setFormulaChoices({});
    setFormulaSteps([]);
    setFormulaError("");
    setFormulaLoading(true);
    setFormulaOpen(true);

    try {
      const { data: steps, error: stepsError } =
        await supabase
          .from("formula_steps")
          .select("*")
          .eq("formula_product_id", product.id)
          .order("display_order", { ascending: true });

      if (stepsError) throw stepsError;

      if (!steps || steps.length === 0) {
        throw new Error(
          "Cette formule n’est pas encore configurée."
        );
      }

      const stepIds = steps.map((step) => step.id);

      const {
        data: allowedRows,
        error: allowedError,
      } = await supabase
        .from("formula_step_products")
        .select("*")
        .in("formula_step_id", stepIds);

      if (allowedError) throw allowedError;

      const allowedProductIds = [
        ...new Set(
          (allowedRows || [])
            .map((row) => row.product_id)
            .filter(Boolean)
        ),
      ];

      let allowedProducts = [];

      if (allowedProductIds.length > 0) {
        const {
          data: productRows,
          error: productsError,
        } = await supabase
          .from("products")
          .select("*")
          .in("id", allowedProductIds)
          .eq("available", true)
          .order("display_order", { ascending: true })
          .order("name", { ascending: true });

        if (productsError) throw productsError;

        allowedProducts = productRows || [];
      }

      const productMap = new Map(
        allowedProducts.map((item) => [
          String(item.id),
          item,
        ])
      );

      const enrichedSteps = steps.map((step) => ({
        ...step,
        products: (allowedRows || [])
          .filter(
            (row) =>
              String(row.formula_step_id) ===
              String(step.id)
          )
          .map((row) =>
            productMap.get(String(row.product_id))
          )
          .filter(Boolean),
      }));

      setFormulaSteps(enrichedSteps);
    } catch (error) {
      console.error(
        "Erreur chargement formule :",
        error
      );

      setFormulaError(
        error?.message ||
          "Impossible de charger cette formule."
      );
    } finally {
      setFormulaLoading(false);
    }
  }

  function chooseFormulaProduct(stepId, product) {
    setFormulaChoices((current) => ({
      ...current,
      [stepId]: product,
    }));
  }

  function closeFormula() {
    setFormulaOpen(false);
    setFormulaProduct(null);
    setFormulaSteps([]);
    setFormulaChoices({});
    setFormulaError("");
  }

  function addFormulaToCart() {
    if (!formulaProduct) return;

    const missingStep = formulaSteps.find(
      (step) =>
        !formulaChoices[step.id]
    );

    if (missingStep) {
      setFormulaError(
        `Choisissez votre ${String(
          missingStep.name || "produit"
        ).toLowerCase()}.`
      );
      return;
    }

    const formulaKey = `formula-${formulaProduct.id}-${Date.now()}`;

    const selections = formulaSteps.map((step) => ({
      step_id: step.id,
      step_name: step.name,
      product_id: formulaChoices[step.id].id,
      product_name: formulaChoices[step.id].name,
      image_url: formulaChoices[step.id].image_url || "",
    }));

    setCart((current) => ({
      ...current,
      [formulaKey]: {
        type: "formula",
        qty: 1,
        formula_product_id: formulaProduct.id,
        name: formulaProduct.name,
        price: Number(formulaProduct.price || 0),
        image_url: formulaProduct.image_url || "",
        selections,
      },
    }));

    closeFormula();
  }

  /* =========================================
     PANIER : TOTAL ET QUANTITÉ
  ========================================= */

  const cartCount =
    Object.values(cart).reduce(
      (sum, entry) =>
        sum +
        (typeof entry === "number"
          ? entry
          : Number(entry?.qty || 0)),
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
    Object.entries(cart).reduce(
      (sum, [id, entry]) => {
        if (
          typeof entry === "object" &&
          entry?.type === "formula"
        ) {
          return (
            sum +
            Number(entry.price || 0) *
              Number(entry.qty || 1)
          );
        }

        const quantity = Number(entry || 0);

        const product =
          products.find(
            (currentProduct) =>
              String(currentProduct.id) ===
              String(id)
          );

        if (!product) {
          return sum;
        }

        return (
          sum +
          Number(product.price) * quantity
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
    setCart((current) => {
      const currentEntry = current[productId];

      if (
        typeof currentEntry === "object" &&
        currentEntry?.type === "formula"
      ) {
        const nextQty =
          Number(currentEntry.qty || 1) +
          difference;

        const nextCart = { ...current };

        if (nextQty <= 0) {
          delete nextCart[productId];
        } else {
          nextCart[productId] = {
            ...currentEntry,
            qty: nextQty,
          };
        }

        return nextCart;
      }

      const nextCart = {
        ...current,
        [productId]:
          Number(currentEntry || 0) +
          difference,
      };

      if (nextCart[productId] <= 0) {
        delete nextCart[productId];
      }

      return nextCart;
    });
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
      Object.entries(cart).map(
        ([id, entry]) => {
          if (
            typeof entry === "object" &&
            entry?.type === "formula"
          ) {
            return {
              id: Number(
                entry.formula_product_id
              ),
              qty: Number(entry.qty || 1),
              formula: true,
              formula_name: entry.name,
              formula_selections:
                entry.selections || [],
            };
          }

          return {
            id: Number(id),
            qty: Number(entry || 0),
          };
        }
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
      <main
        className={`container commander-modern ${styles.page} ${
          cartCount > 0 ? styles.pageWithCart : ""
        }`}
      >
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

        {category !== null && (
          <button
            type="button"
            className="commander-return"
            onClick={() => {
              setCategory(null);
              window.history.replaceState(
                {},
                "",
                "/commander"
              );
            }}
          >
            ← Retour
          </button>
        )}

        {category === null ? (
          <>
            <header className={styles.intro}>
              <div className={styles.introText}>
                <h1>Commander</h1>
                <p>Qu’est-ce qui vous fait envie ?</p>
                <span className={styles.yellowLine} aria-hidden="true" />
              </div>

              <img
                src="/basil-commander.png"
                alt=""
                aria-hidden="true"
                className={styles.basil}
              />
            </header>

            <section className={`category-family-grid ${styles.categoryGrid}`}>
              {categoryOrder.map((currentCategory, index) => (
                <button
                  type="button"
                  key={currentCategory}
                  className={`category-family-card ${styles.categoryCard}`}
                  onClick={() =>
                    setCategory(currentCategory)
                  }
                >
                  <div className={`category-family-image ${styles.categoryImage}`}>
                    <img
                      src={getCategoryImage(currentCategory)}
                      alt={currentCategory}
                    />
                  </div>

                  <div
                    className={`category-family-name ${styles.categoryName} ${
                      index % 2 === 0
                        ? styles.bandGreen
                        : styles.bandCream
                    }`}
                  >
                    {currentCategory}
                  </div>
                </button>
              ))}
            </section>
          </>
        ) : (
          <div className="category-nav commander-category-nav">
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
              <section className="product-list-mobile commander-product-list">
                {visibleProducts.map((product) => {
                  const rawProductQuantity =
                    cart[product.id];

                  const productQuantity =
                    typeof rawProductQuantity === "number"
                      ? rawProductQuantity
                      : 0;

                  const isFormula =
                    product.normalized_category ===
                    "Formules";

                  return (
                    <article
                      className="product-row-card commander-product-card"
                      key={product.id}
                    >
                      <div className="product-row-image commander-product-image">
                        {product.image_url ? (
                          <img
                            src={product.image_url}
                            alt={product.name}
                          />
                        ) : (
                          <img
                            src={getCategoryImage(category)}
                            alt={product.name}
                          />
                        )}
                      </div>

                      <div className="product-row-content commander-product-content">
                        <div className="commander-product-copy">
                          <h3>{product.name}</h3>

                          <p>
                            {product.description ||
                              "Préparé avec soin par So Fresh."}
                          </p>
                        </div>

                        <div className="commander-product-footer">
                          <div className="commander-product-price">
                            {euro(product.price)}
                          </div>

                          {isFormula ? (
                            <button
                              type="button"
                              className="commander-add-button"
                              onClick={() =>
                                openFormula(product)
                              }
                              aria-label={`Composer ${product.name}`}
                            >
                              + Ajouter
                            </button>
                          ) : productQuantity > 0 ? (
                            <div
                              className="commander-quantity"
                              aria-label={`Quantité de ${product.name}`}
                            >
                              <button
                                type="button"
                                onClick={() =>
                                  changeQuantity(
                                    product.id,
                                    -1
                                  )
                                }
                                aria-label={`Retirer un ${product.name}`}
                              >
                                −
                              </button>

                              <span>
                                {productQuantity}
                              </span>

                              <button
                                type="button"
                                onClick={() =>
                                  changeQuantity(
                                    product.id,
                                    1
                                  )
                                }
                                aria-label={`Ajouter un ${product.name}`}
                              >
                                +
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              className="commander-add-button"
                              onClick={() =>
                                addProduct(product.id)
                              }
                              aria-label={`Ajouter ${product.name} au panier`}
                            >
                              + Ajouter
                            </button>
                          )}
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

        {cartCount > 0 && (
          <Link
            href="/panier"
            className={`commander-cart-summary ${styles.cartDock}`}
          >
            <div className="commander-cart-summary-left">
              <div className="commander-cart-summary-icon">
                <ShoppingBag
                  size={22}
                  strokeWidth={1.9}
                />

                <span>{cartCount}</span>
              </div>

              <div className="commander-cart-summary-copy">
                <strong>Voir mon panier</strong>
                <span>
                  {cartCount}{" "}
                  {cartCount > 1
                    ? "articles"
                    : "article"}{" "}
                  · {euro(cartTotal)}
                </span>
              </div>
            </div>

            <ArrowRight
              size={20}
              strokeWidth={1.9}
            />
          </Link>
        )}
      </main>

      {formulaOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Composer ma formule"
          onClick={closeFormula}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 10000,
            background: "rgba(20, 28, 12, 0.48)",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            padding: "12px",
          }}
        >
          <div
            onClick={(event) =>
              event.stopPropagation()
            }
            style={{
              width: "100%",
              maxWidth: "520px",
              maxHeight: "88vh",
              overflowY: "auto",
              background: "#FBFBF9",
              borderRadius: "22px 22px 16px 16px",
              boxShadow:
                "0 -10px 35px rgba(0,0,0,0.18)",
            }}
          >
            <div
              style={{
                position: "sticky",
                top: 0,
                zIndex: 2,
                padding: "18px 18px 14px",
                background: "#FBFBF9",
                borderBottom:
                  "1px solid rgba(90,127,13,0.12)",
              }}
            >
              <button
                type="button"
                onClick={closeFormula}
                aria-label="Fermer"
                style={{
                  position: "absolute",
                  top: "14px",
                  right: "14px",
                  width: "34px",
                  height: "34px",
                  borderRadius: "50%",
                  border:
                    "1px solid rgba(90,127,13,0.22)",
                  background: "#ffffff",
                  color: "#5A7F0D",
                  fontSize: "22px",
                  lineHeight: 1,
                  cursor: "pointer",
                }}
              >
                ×
              </button>

              <div
                style={{
                  paddingRight: "44px",
                }}
              >
                <div
                  style={{
                    fontSize: "12px",
                    fontWeight: "800",
                    color: "#98BD12",
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                  }}
                >
                  Ma formule
                </div>

                <h2
                  style={{
                    margin: "3px 0 0",
                    fontSize: "22px",
                    color: "#24300f",
                  }}
                >
                  {formulaProduct?.name}
                </h2>

                <div
                  style={{
                    marginTop: "4px",
                    fontSize: "16px",
                    fontWeight: "900",
                    color: "#5A7F0D",
                  }}
                >
                  {euro(formulaProduct?.price)}
                </div>
              </div>
            </div>

            <div
              style={{
                padding: "16px 16px 20px",
              }}
            >
              {formulaLoading && (
                <div
                  style={{
                    padding: "28px 8px",
                    textAlign: "center",
                    color: "#5A7F0D",
                  }}
                >
                  Chargement de la formule…
                </div>
              )}

              {!formulaLoading &&
                formulaSteps.map(
                  (step, stepIndex) => (
                    <section
                      key={step.id}
                      style={{
                        marginBottom: "22px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                          marginBottom: "10px",
                        }}
                      >
                        <span
                          style={{
                            width: "28px",
                            height: "28px",
                            borderRadius: "50%",
                            background: "#98BD12",
                            color: "#ffffff",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "13px",
                            fontWeight: "900",
                            flexShrink: 0,
                          }}
                        >
                          {stepIndex + 1}
                        </span>

                        <div>
                          <strong
                            style={{
                              display: "block",
                              color: "#24300f",
                              fontSize: "16px",
                            }}
                          >
                            Choisissez votre{" "}
                            {String(
                              step.name || "produit"
                            ).toLowerCase()}
                          </strong>
                          <span
                            style={{
                              fontSize: "11px",
                              color: "#6f765f",
                            }}
                          >
                            1 choix
                          </span>
                        </div>
                      </div>

                      {step.products.length === 0 ? (
                        <div
                          style={{
                            padding: "12px",
                            borderRadius: "12px",
                            background: "#fff4e8",
                            fontSize: "13px",
                          }}
                        >
                          Aucun produit autorisé pour
                          cette étape.
                        </div>
                      ) : (
                        <div
                          style={{
                            display: "grid",
                            gap: "9px",
                          }}
                        >
                          {step.products.map(
                            (choice) => {
                              const selected =
                                String(
                                  formulaChoices[
                                    step.id
                                  ]?.id
                                ) ===
                                String(choice.id);

                              return (
                                <button
                                  key={choice.id}
                                  type="button"
                                  onClick={() =>
                                    chooseFormulaProduct(
                                      step.id,
                                      choice
                                    )
                                  }
                                  style={{
                                    width: "100%",
                                    minHeight: "66px",
                                    padding: "7px 10px",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "11px",
                                    textAlign: "left",
                                    borderRadius: "13px",
                                    border: selected
                                      ? "2px solid #98BD12"
                                      : "1px solid #dde2d1",
                                    background: selected
                                      ? "#f3f8df"
                                      : "#ffffff",
                                    cursor: "pointer",
                                  }}
                                >
                                  <img
                                    src={
                                      choice.image_url ||
                                      getCategoryImage(
                                        normalizeCategory(
                                          choice.category
                                        )
                                      )
                                    }
                                    alt={choice.name}
                                    style={{
                                      width: "52px",
                                      height: "52px",
                                      objectFit: "cover",
                                      borderRadius: "10px",
                                      flexShrink: 0,
                                    }}
                                  />

                                  <span
                                    style={{
                                      flex: 1,
                                      minWidth: 0,
                                    }}
                                  >
                                    <strong
                                      style={{
                                        display: "block",
                                        fontSize: "13px",
                                        color: "#24300f",
                                      }}
                                    >
                                      {choice.name}
                                    </strong>

                                    {choice.description &&
                                      choice.description.trim() &&
                                      choice.description.trim().toUpperCase() !== "EMPTY" && (
                                        <span
                                          style={{
                                            display: "block",
                                            marginTop: "3px",
                                            fontSize: "11px",
                                            lineHeight: "1.3",
                                            color: "#6f765f",
                                            whiteSpace: "pre-line",
                                          }}
                                        >
                                          {choice.description}
                                        </span>
                                      )}
                                  </span>

                                  <span
                                    style={{
                                      width: "24px",
                                      height: "24px",
                                      borderRadius: "50%",
                                      border: selected
                                        ? "2px solid #98BD12"
                                        : "2px solid #cbd2bd",
                                      background: selected
                                        ? "#98BD12"
                                        : "#ffffff",
                                      color: "#ffffff",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      fontWeight: "900",
                                      flexShrink: 0,
                                    }}
                                  >
                                    {selected ? "✓" : ""}
                                  </span>
                                </button>
                              );
                            }
                          )}
                        </div>
                      )}
                    </section>
                  )
                )}

              {formulaError && (
                <div
                  style={{
                    marginBottom: "12px",
                    padding: "11px 12px",
                    borderRadius: "11px",
                    background: "#fff4e8",
                    color: "#8a4b00",
                    fontSize: "13px",
                    fontWeight: "700",
                  }}
                >
                  {formulaError}
                </div>
              )}

              {!formulaLoading &&
                formulaSteps.length > 0 && (
                  <button
                    type="button"
                    onClick={addFormulaToCart}
                    style={{
                      width: "100%",
                      minHeight: "54px",
                      border: "none",
                      borderRadius: "14px",
                      background: "#5A7F0D",
                      color: "#ffffff",
                      fontSize: "15px",
                      fontWeight: "900",
                      cursor: "pointer",
                      boxShadow:
                        "0 6px 16px rgba(90,127,13,0.20)",
                    }}
                  >
                    Ajouter ma formule au panier ·{" "}
                    {euro(formulaProduct?.price)}
                  </button>
                )}
            </div>
          </div>
        </div>
      )}

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