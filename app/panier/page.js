"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { useRouter } from "next/navigation";

import Cart from "../components/Cart";
import HomeHeader from "../components/HomeHeader";

import {
  isSupabaseConfigured,
  supabase,
} from "../../lib/supabase";

function parseTimeToMinutes(value) {
  const normalized = String(value || "")
    .trim()
    .replace(/\s*h\s*/i, ":");

  const match = normalized.match(
    /^(\d{1,2}):(\d{2})$/
  );

  if (!match) return null;

  return (
    Number(match[1]) * 60 +
    Number(match[2])
  );
}

function formatPickupTime(totalMinutes) {
  const hours = Math.floor(
    totalMinutes / 60
  );

  const minutes =
    totalMinutes % 60;

  return `${String(hours).padStart(
    2,
    "0"
  )} h ${String(minutes).padStart(
    2,
    "0"
  )}`;
}

function generatePickupTimes(settings) {
  if (!settings) return [];

  const first =
    parseTimeToMinutes(
      settings.first_pickup_time
    );

  const last =
    parseTimeToMinutes(
      settings.last_pickup_time
    );

  const interval =
    Number(settings.slot_interval);

  if (
    first === null ||
    last === null ||
    !Number.isInteger(interval) ||
    interval < 1 ||
    first > last
  ) {
    return [];
  }

  const times = [];

  for (
    let current = first;
    current <= last;
    current += interval
  ) {
    times.push(
      formatPickupTime(current)
    );
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
        (part) =>
          part.type === type
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
  return `${date.getFullYear()}-${String(
    date.getMonth() + 1
  ).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

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

  return (
    start &&
    end &&
    isoDate >= start &&
    isoDate <= end
  );
}

function isOpenDay(date, settings) {
  const days = {
    0: settings?.open_sunday,
    1: settings?.open_monday,
    2: settings?.open_tuesday,
    3: settings?.open_wednesday,
    4: settings?.open_thursday,
    5: settings?.open_friday,
    6: settings?.open_saturday,
  };

  return Boolean(
    days[date.getDay()]
  );
}

function getPickupDates(settings) {
  if (!settings) return [];

  const now = parisNow();

  const today = new Date(
    now.year,
    now.month - 1,
    now.day,
    12,
    0,
    0
  );

  const cutoff =
    parseTimeToMinutes(
      settings.cutoff_time
    );

  const currentMinutes =
    now.hour * 60 +
    now.minute;

  const dates = [];
  const cursor = new Date(today);

  let checked = 0;

  while (
    dates.length < 4 &&
    checked < 90
  ) {
    const cursorIso =
      iso(cursor);

    const todayIso =
      iso(today);

    const todayAvailable =
      cursorIso !== todayIso ||
      cutoff === null ||
      currentMinutes < cutoff;

    if (
      isOpenDay(cursor, settings) &&
      todayAvailable &&
      !isDateInsideClosure(
        cursorIso,
        settings
      )
    ) {
      dates.push(
        new Date(cursor)
      );
    }

    cursor.setDate(
      cursor.getDate() + 1
    );

    checked += 1;
  }

  return dates;
}

function dateLabel(date) {
  const formatted =
    new Intl.DateTimeFormat(
      "fr-FR",
      {
        weekday: "short",
        day: "numeric",
        month: "short",
      }
    ).format(date);

  return (
    formatted.charAt(0).toUpperCase() +
    formatted.slice(1)
  );
}

export default function PanierPage() {
  const router = useRouter();

  const [products, setProducts] =
    useState([]);

  const [settings, setSettings] =
    useState(null);

  const [cart, setCart] =
    useState({});

  const [
    cartLoaded,
    setCartLoaded,
  ] = useState(false);

  const [
    pickupDate,
    setPickupDate,
  ] = useState("");

  const [
    pickupTime,
    setPickupTime,
  ] = useState("");

  const [
    customerName,
    setCustomerName,
  ] = useState("");

  const [
    customerPhone,
    setCustomerPhone,
  ] = useState("");

  const [
    loadingSettings,
    setLoadingSettings,
  ] = useState(true);

  const [
    paymentLoading,
    setPaymentLoading,
  ] = useState(false);

  const [message, setMessage] =
    useState("");

  const [
    pickupModalOpen,
    setPickupModalOpen,
  ] = useState(false);

  const [
    draftDate,
    setDraftDate,
  ] = useState("");

  const [
    draftTime,
    setDraftTime,
  ] = useState("");

  const [
    availability,
    setAvailability,
  ] = useState({
    capacity: 0,
    counts: {},
  });

  const [
    availabilityLoading,
    setAvailabilityLoading,
  ] = useState(false);

  useEffect(() => {
    async function checkAccess() {
      if (
        !isSupabaseConfigured ||
        !supabase
      ) {
        router.replace(
          "/acces-commande"
        );
        return;
      }

      const {
        data: { user },
      } =
        await supabase.auth.getUser();

      if (
        !user ||
        !user.email_confirmed_at
      ) {
        router.replace(
          "/acces-commande"
        );
      }
    }

    checkAccess();
  }, [router]);

  useEffect(() => {
    const saved =
      localStorage.getItem(
        "sofresh_cart"
      );

    if (saved) {
      try {
        setCart(
          JSON.parse(saved)
        );
      } catch {}
    }

    setPickupDate(
      localStorage.getItem(
        "sofresh_pickup_date"
      ) || ""
    );

    setPickupTime(
      localStorage.getItem(
        "sofresh_pickup_time"
      ) || ""
    );

    setCartLoaded(true);
  }, []);

  useEffect(() => {
    if (!cartLoaded) return;

    localStorage.setItem(
      "sofresh_cart",
      JSON.stringify(cart)
    );
  }, [cart, cartLoaded]);

  useEffect(() => {
    async function loadProducts() {
      if (!supabase) return;

      const {
        data,
        error,
      } =
        await supabase
          .from("products")
          .select("*")
          .eq("available", true)
          .order(
            "display_order",
            {
              ascending: true,
            }
          );

      if (!error) {
        setProducts(data || []);
      }
    }

    loadProducts();
  }, []);

  useEffect(() => {
    async function loadSettings() {
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

        setSettings(data);
      } catch {
        setMessage(
          "Les horaires sont indisponibles."
        );
      } finally {
        setLoadingSettings(false);
      }
    }

    loadSettings();
  }, []);

  useEffect(() => {
    async function loadCustomer() {
      if (!supabase) return;

      const {
        data: { user },
      } =
        await supabase.auth.getUser();

      if (!user) return;

      const firstName =
        user.user_metadata
          ?.first_name || "";

      const lastName =
        user.user_metadata
          ?.last_name || "";

      const phone =
        user.user_metadata
          ?.phone || "";

      setCustomerName(
        `${firstName} ${lastName}`.trim()
      );

      setCustomerPhone(phone);
    }

    loadCustomer();
  }, []);

  const dates = useMemo(
    () =>
      getPickupDates(settings),
    [settings]
  );

  const pickupTimes =
    useMemo(
      () =>
        generatePickupTimes(
          settings
        ),
      [settings]
    );

  /*
   * Disponibilité du jour affiché
   * dans la fenêtre de modification.
   */
  useEffect(() => {
    if (
      !pickupModalOpen ||
      !draftDate
    ) {
      return;
    }

    let cancelled = false;

    async function loadAvailability() {
      setAvailabilityLoading(true);

      setAvailability({
        capacity: 0,
        counts: {},
      });

      try {
        const response =
          await fetch(
            `/api/availability?date=${draftDate}`,
            {
              cache: "no-store",
            }
          );

        if (!response.ok) {
          return;
        }

        const data =
          await response.json();

        if (!cancelled) {
          setAvailability({
            capacity:
              Number(
                data?.capacity
              ) || 0,

            counts:
              data?.counts || {},
          });
        }
      } catch (error) {
        console.error(
          "Erreur disponibilité des créneaux :",
          error
        );
      } finally {
        if (!cancelled) {
          setAvailabilityLoading(
            false
          );
        }
      }
    }

    loadAvailability();

    return () => {
      cancelled = true;
    };
  }, [
    draftDate,
    pickupModalOpen,
  ]);

  /*
   * Si le client change de jour
   * et que l'heure sélectionnée
   * est complète, on la désélectionne.
   */
  useEffect(() => {
    if (
      !pickupModalOpen ||
      availabilityLoading ||
      !draftTime
    ) {
      return;
    }

    const capacity =
      Number(
        availability.capacity
      ) || 0;

    if (capacity <= 0) {
      return;
    }

    const count =
      Number(
        availability.counts?.[
          draftTime
        ]
      ) || 0;

    if (count >= capacity) {
      setDraftTime("");
    }
  }, [
    availability,
    availabilityLoading,
    draftTime,
    pickupModalOpen,
  ]);

  const now = parisNow();

  const todayIso =
    `${now.year}-${String(
      now.month
    ).padStart(2, "0")}-${String(
      now.day
    ).padStart(2, "0")}`;

  const serviceOpen =
    Boolean(
      settings?.restaurant_open
    ) &&
    !isDateInsideClosure(
      todayIso,
      settings
    );

  const cartCount =
    Object.values(cart).reduce(
      (sum, qty) =>
        sum + Number(qty || 0),
      0
    );

  const cartTotal =
    Object.entries(cart).reduce(
      (
        total,
        [id, quantity]
      ) => {
        const product =
          products.find(
            (item) =>
              String(item.id) ===
              String(id)
          );

        if (!product) {
          return total;
        }

        return (
          total +
          Number(product.price) *
            Number(quantity)
        );
      },
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

  function changeQuantity(
    productId,
    difference
  ) {
    setCart((current) => {
      const next = {
        ...current,

        [productId]:
          (current[productId] || 0) +
          difference,
      };

      if (
        next[productId] <= 0
      ) {
        delete next[productId];
      }

      return next;
    });
  }

  function openPickupModal() {
    const initialDate =
      pickupDate ||
      (dates[0]
        ? iso(dates[0])
        : "");

    setDraftDate(
      initialDate
    );

    setDraftTime(
      pickupTime || ""
    );

    setPickupModalOpen(
      true
    );
  }

  function selectDraftDate(
    value
  ) {
    setDraftDate(value);

    /*
     * On retire temporairement
     * l'heure pendant le chargement
     * des disponibilités du nouveau jour.
     */
    setDraftTime("");
  }

  function isSlotFull(time) {
    const capacity =
      Number(
        availability.capacity
      ) || 0;

    if (capacity <= 0) {
      return false;
    }

    const count =
      Number(
        availability.counts?.[
          time
        ]
      ) || 0;

    return count >= capacity;
  }

  function savePickup() {
    if (
      !draftDate ||
      !draftTime ||
      availabilityLoading ||
      isSlotFull(draftTime)
    ) {
      return;
    }

    setPickupDate(
      draftDate
    );

    setPickupTime(
      draftTime
    );

    localStorage.setItem(
      "sofresh_pickup_date",
      draftDate
    );

    localStorage.setItem(
      "sofresh_pickup_time",
      draftTime
    );

    setPickupModalOpen(
      false
    );
  }

  async function submitOrder() {
    setMessage("");

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

    if (
      !pickupDate ||
      !pickupTime
    ) {
      setMessage(
        "Choisissez votre créneau de retrait."
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
        ([id, quantity]) => ({
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

        setPaymentLoading(
          false
        );

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

      setPaymentLoading(
        false
      );
    }
  }

  return (
    <>
      <HomeHeader
        cartCount={cartCount}
      />

      <Cart
        pageMode
        open
        onClose={() =>
          router.push(
            "/commander"
          )
        }
        onEditPickup={
          openPickupModal
        }
        cart={cart}
        products={products}
        cartCount={
          cartCount
        }
        cartTotal={
          cartTotal
        }
        changeQuantity={
          changeQuantity
        }
        loadingSettings={
          loadingSettings
        }
        dates={dates}
        pickupDate={
          pickupDate
        }
        iso={iso}
        pickupTime={
          pickupTime
        }
        customerName={
          customerName
        }
        setCustomerName={
          setCustomerName
        }
        customerPhone={
          customerPhone
        }
        setCustomerPhone={
          setCustomerPhone
        }
        paymentLoading={
          paymentLoading
        }
        serviceOpen={
          serviceOpen
        }
        submitOrder={
          submitOrder
        }
        message={message}
      />

      {pickupModalOpen && (
        <div
          onClick={() =>
            setPickupModalOpen(
              false
            )
          }
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 5000,
            background:
              "rgba(0,0,0,0.45)",
            display: "flex",
            alignItems:
              "flex-end",
            justifyContent:
              "center",
          }}
        >
          <div
            onClick={(event) =>
              event.stopPropagation()
            }
            style={{
              width: "100%",
              maxWidth: "600px",
              background:
                "#ffffff",
              borderRadius:
                "24px 24px 0 0",
              padding:
                "22px 18px 28px",
              boxShadow:
                "0 -10px 30px rgba(0,0,0,0.18)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent:
                  "space-between",
                alignItems:
                  "center",
                marginBottom:
                  "20px",
              }}
            >
              <strong
                style={{
                  fontSize:
                    "20px",
                  color:
                    "#1f2f1f",
                }}
              >
                Modifier le retrait
              </strong>

              <button
                type="button"
                onClick={() =>
                  setPickupModalOpen(
                    false
                  )
                }
                style={{
                  border: 0,
                  background:
                    "transparent",
                  fontSize:
                    "28px",
                  cursor:
                    "pointer",
                }}
              >
                ×
              </button>
            </div>

            <div
              style={{
                fontSize:
                  "12px",
                fontWeight:
                  "800",
                color:
                  "#5A7F0D",
                marginBottom:
                  "8px",
              }}
            >
              CHOISISSEZ LE JOUR
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(2, 1fr)",
                gap: "8px",
                marginBottom:
                  "20px",
              }}
            >
              {dates.map(
                (date) => {
                  const value =
                    iso(date);

                  const selected =
                    draftDate ===
                    value;

                  return (
                    <button
                      type="button"
                      key={value}
                      onClick={() =>
                        selectDraftDate(
                          value
                        )
                      }
                      style={{
                        minHeight:
                          "48px",
                        borderRadius:
                          "12px",
                        border:
                          selected
                            ? "2px solid #5A7F0D"
                            : "1px solid #DFD178",
                        background:
                          selected
                            ? "#F4F8DF"
                            : "#ffffff",
                        color:
                          "#1f2f1f",
                        fontWeight:
                          "700",
                        cursor:
                          "pointer",
                      }}
                    >
                      {dateLabel(
                        date
                      )}
                    </button>
                  );
                }
              )}
            </div>

            <div
              style={{
                fontSize:
                  "12px",
                fontWeight:
                  "800",
                color:
                  "#5A7F0D",
                marginBottom:
                  "8px",
              }}
            >
              CHOISISSEZ L'HEURE
            </div>

            {availabilityLoading ? (
              <div
                style={{
                  padding:
                    "22px 0",
                  textAlign:
                    "center",
                  color:
                    "#6A6F63",
                  fontSize:
                    "14px",
                }}
              >
                Vérification des créneaux…
              </div>
            ) : (
              <div
                style={{
                  display:
                    "grid",
                  gridTemplateColumns:
                    "repeat(3, 1fr)",
                  gap: "8px",
                  marginBottom:
                    "22px",
                  maxHeight:
                    "180px",
                  overflowY:
                    "auto",
                }}
              >
                {pickupTimes.map(
                  (time) => {
                    const selected =
                      draftTime ===
                      time;

                    const full =
                      isSlotFull(
                        time
                      );

                    return (
                      <button
                        type="button"
                        key={time}
                        disabled={
                          full
                        }
                        onClick={() =>
                          setDraftTime(
                            time
                          )
                        }
                        style={{
                          minHeight:
                            "48px",
                          borderRadius:
                            "12px",
                          border:
                            selected
                              ? "2px solid #5A7F0D"
                              : "1px solid #DFD178",
                          background:
                            full
                              ? "#F1F1F1"
                              : selected
                                ? "#F4F8DF"
                                : "#ffffff",
                          color:
                            full
                              ? "#999999"
                              : "#1f2f1f",
                          fontWeight:
                            "700",
                          cursor:
                            full
                              ? "not-allowed"
                              : "pointer",
                          opacity:
                            full
                              ? 0.7
                              : 1,
                          padding:
                            "5px 3px",
                        }}
                      >
                        <span
                          style={{
                            display:
                              "block",
                          }}
                        >
                          {time}
                        </span>

                        {full && (
                          <span
                            style={{
                              display:
                                "block",
                              fontSize:
                                "9px",
                              marginTop:
                                "2px",
                              fontWeight:
                                "700",
                            }}
                          >
                            COMPLET
                          </span>
                        )}
                      </button>
                    );
                  }
                )}
              </div>
            )}

            <button
              type="button"
              onClick={
                savePickup
              }
              disabled={
                !draftDate ||
                !draftTime ||
                availabilityLoading ||
                isSlotFull(
                  draftTime
                )
              }
              style={{
                width: "100%",
                minHeight:
                  "50px",
                border: 0,
                borderRadius:
                  "14px",
                background:
                  !draftTime ||
                  availabilityLoading
                    ? "#C7D68B"
                    : "#98BD12",
                color:
                  "#ffffff",
                fontSize:
                  "15px",
                fontWeight:
                  "800",
                cursor:
                  !draftTime ||
                  availabilityLoading
                    ? "not-allowed"
                    : "pointer",
              }}
            >
              Valider ce créneau
            </button>
          </div>
        </div>
      )}
    </>
  );
}