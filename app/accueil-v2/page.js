"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Phone,
  Mail,
  MapPin,
  ShoppingBag,
} from "lucide-react";

function parseTimeToMinutes(value) {
  const normalized = String(value || "")
    .trim()
    .replace(/\s*h\s*/i, ":");

  const match = normalized.match(/^(\d{1,2}):(\d{2})$/);

  if (!match) return null;

  return Number(match[1]) * 60 + Number(match[2]);
}

function generatePickupTimes(settings) {
  if (!settings) return [];

  const first = parseTimeToMinutes(
    settings.first_pickup_time
  );

  const last = parseTimeToMinutes(
    settings.last_pickup_time
  );

  const interval = Number(settings.slot_interval);

  if (
    first === null ||
    last === null ||
    !Number.isInteger(interval) ||
    interval <= 0
  ) {
    return [];
  }

  const times = [];

  for (
    let current = first;
    current <= last;
    current += interval
  ) {
    const h = Math.floor(current / 60);
    const m = current % 60;

    times.push(
      `${String(h).padStart(2, "0")}h${String(m).padStart(
        2,
        "0"
      )}`
    );
  }

  return times;
}

export default function AccueilV2() {
  const [settings, setSettings] = useState(null);

  const [hour, setHour] = useState(12);
  const [minutes, setMinutes] = useState(15);
  const [selectedDay, setSelectedDay] = useState(0);
  const [showAllSlots, setShowAllSlots] =
    useState(false);
    const pickupRestoredRef = useRef(false);
const skipNextPickupSaveRef = useRef(false);

  const [availability, setAvailability] = useState({
    capacity: 0,
    counts: {},
  });

  /* ===============================
     CHARGEMENT DES PARAMÈTRES
  =============================== */

  useEffect(() => {
    async function loadSettings() {
      try {
        const response = await fetch("/api/settings", {
          cache: "no-store",
        });

        const data = await response.json();

        if (response.ok) {
          setSettings(data);
        }
      } catch (error) {
        console.error(
          "Erreur chargement horaires :",
          error
        );
      }
    }

    loadSettings();
  }, []);

  /* ===============================
     DATE DU JOUR À PARIS
  =============================== */

  const now = new Date();

  const parisParts = new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(now);

  const getPart = (type) =>
    Number(
      parisParts.find((part) => part.type === type)
        ?.value
    );

  const parisToday = new Date(
    Date.UTC(
      getPart("year"),
      getPart("month") - 1,
      getPart("day"),
      12
    )
  );

  const todayIso = `${parisToday.getUTCFullYear()}-${String(
    parisToday.getUTCMonth() + 1
  ).padStart(2, "0")}-${String(
    parisToday.getUTCDate()
  ).padStart(2, "0")}`;

  /* ===============================
     FERMETURE EXCEPTIONNELLE
  =============================== */

  const closureEnabled = Boolean(
    settings?.closure_enabled
  );

  const closureStartDate =
    settings?.closure_start_date || "";

  const closureEndDate =
    settings?.closure_end_date || "";

  function isDateInsideClosure(isoDate) {
    return Boolean(
      closureEnabled &&
        closureStartDate &&
        closureEndDate &&
        isoDate >= closureStartDate &&
        isoDate <= closureEndDate
    );
  }

  const isClosureActiveToday =
    isDateInsideClosure(todayIso);

  /* ===============================
     DATES DE RETRAIT
  =============================== */

  const pickupDates = [];

  const openByDay = {
    0: settings?.open_sunday ?? false,
    1: settings?.open_monday ?? true,
    2: settings?.open_tuesday ?? true,
    3: settings?.open_wednesday ?? true,
    4: settings?.open_thursday ?? true,
    5: settings?.open_friday ?? true,
    6: settings?.open_saturday ?? false,
  };

  let cursor = new Date(parisToday);
  let safetyCounter = 0;

  while (
    pickupDates.length < 3 &&
    safetyCounter < 90
  ) {
    const dayOfWeek = cursor.getUTCDay();

    const cursorIso = `${cursor.getUTCFullYear()}-${String(
      cursor.getUTCMonth() + 1
    ).padStart(2, "0")}-${String(
      cursor.getUTCDate()
    ).padStart(2, "0")}`;

    if (
      openByDay[dayOfWeek] &&
      !isDateInsideClosure(cursorIso)
    ) {
      const differenceInDays = Math.round(
        (cursor.getTime() - parisToday.getTime()) /
          (1000 * 60 * 60 * 24)
      );

      let label;

      if (differenceInDays === 0) {
        label = "Aujourd'hui";
      } else if (differenceInDays === 1) {
        label = "Demain";
      } else {
        label = new Intl.DateTimeFormat("fr-FR", {
          weekday: "short",
          timeZone: "UTC",
        }).format(cursor);
      }

      pickupDates.push({
        label,
        iso: cursorIso,

        day: String(cursor.getUTCDate()).padStart(
          2,
          "0"
        ),

        month: new Intl.DateTimeFormat("fr-FR", {
          month: "long",
          timeZone: "UTC",
        }).format(cursor),
      });
    }

    cursor.setUTCDate(
      cursor.getUTCDate() + 1
    );

    safetyCounter += 1;
  }

  /* ===============================
     CRÉNEAUX HORAIRES
  =============================== */

  const formattedHour = String(hour).padStart(
    2,
    "0"
  );

  const formattedMinutes = String(minutes).padStart(
    2,
    "0"
  );

  const allSlots = generatePickupTimes(settings);

  const visibleSlots = showAllSlots
    ? allSlots
    : allSlots.slice(0, 6);

  function isPastSlot(time) {
    const selectedDate =
      pickupDates[selectedDay]?.iso;

    if (!selectedDate) return false;

    // Les créneaux futurs ne sont jamais considérés passés.
    if (selectedDate !== todayIso) return false;

    const slotMinutes = parseTimeToMinutes(time);

    if (slotMinutes === null) return false;

    const parts = new Intl.DateTimeFormat("fr-FR", {
      timeZone: "Europe/Paris",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(new Date());

    const currentHour = Number(
      parts.find((part) => part.type === "hour")
        ?.value || 0
    );

    const currentMinute = Number(
      parts.find((part) => part.type === "minute")
        ?.value || 0
    );

    const currentMinutes =
      currentHour * 60 + currentMinute;

    return slotMinutes <= currentMinutes;
  }

  function isSlotFull(time) {
    const capacity = Number(
      availability.capacity || 0
    );

    if (capacity <= 0) return false;

    const commanderFormat = time.replace(
      /^(\d{2})h(\d{2})$/,
      "$1 h $2"
    );

    const count = Number(
      availability.counts?.[time] ??
        availability.counts?.[commanderFormat] ??
        0
    );

    return count >= capacity;
  }

  /* ===============================
     DISPONIBILITÉ DES CRÉNEAUX
  =============================== */

  useEffect(() => {
    async function loadAvailability() {
      try {
        const selectedDate =
          pickupDates[selectedDay]?.iso;

        if (!selectedDate) return;

        const response = await fetch(
          `/api/availability?date=${selectedDate}`,
          {
            cache: "no-store",
          }
        );

        if (!response.ok) return;

        const data = await response.json();

        setAvailability({
          capacity: Number(data.capacity || 0),
          counts: data.counts || {},
        });
      } catch (error) {
        console.error(
          "Erreur chargement disponibilités :",
          error
        );
      }
    }

    loadAvailability();
  }, [selectedDay, settings]);

/* ===============================
   RESTAURATION DU RETRAIT
=============================== */

useEffect(() => {
 if (
  !settings ||
  pickupDates.length === 0 ||
  pickupRestoredRef.current
) {
  return;
}

  const savedDate = localStorage.getItem(
    "sofresh_pickup_date"
  );

  const savedTime = localStorage.getItem(
    "sofresh_pickup_time"
  );

  if (savedDate) {
    const savedDayIndex = pickupDates.findIndex(
      (date) => date.iso === savedDate
    );

    if (savedDayIndex >= 0) {
      setSelectedDay(savedDayIndex);
    }
  }

  if (savedTime) {
    const savedMinutes =
      parseTimeToMinutes(savedTime);

    if (savedMinutes !== null) {
      setHour(Math.floor(savedMinutes / 60));
      setMinutes(savedMinutes % 60);
    }
  }

  pickupRestoredRef.current = true;
  skipNextPickupSaveRef.current = true;
}, [settings, pickupDates]);


/* ===============================
   MÉMORISATION DU RETRAIT
=============================== */

useEffect(() => {
  if (!pickupRestoredRef.current) {
    return;
  }

  if (skipNextPickupSaveRef.current) {
    skipNextPickupSaveRef.current = false;
    return;
  }

  if (isClosureActiveToday) {
    localStorage.removeItem(
      "sofresh_pickup_date"
    );

    localStorage.removeItem(
      "sofresh_pickup_time"
    );

    return;
  }

  const selectedDate =
    pickupDates[selectedDay]?.iso;

  if (!selectedDate) return;

  localStorage.setItem(
    "sofresh_pickup_date",
    selectedDate
  );

  localStorage.setItem(
    "sofresh_pickup_time",
    `${formattedHour} h ${formattedMinutes}`
  );
}, [
  selectedDay,
  formattedHour,
  formattedMinutes,
  isClosureActiveToday,
  settings,
]);

  return (
    <main className="home-v2">
      {settings?.closure_enabled && (
  <div className="closure-marquee">
  <div className="closure-marquee-track">
    <span>
      {settings?.closure_message || "So Fresh est fermé pour congés. À très bientôt !"}
    </span>

    <span>
      {settings?.closure_message || "So Fresh est fermé pour congés. À très bientôt !"}
    </span>
  </div>
</div>
)}
      {/* ===============================
          HERO SO FRESH
      =============================== */}

      <div className="hero-final">
        <div className="hero-final-text">
          <h1>
            Votre pause
            <br />
            déjeuner
          </h1>

          <div className="hero-final-script">
            fraîche & gourmande
          </div>
        </div>

        <img
          src="/hero-sofresh.png"
          alt="Salade fraîche So Fresh"
          className="hero-final-image"
        />

        {/* BOUTON COMMANDER */}

        {isClosureActiveToday ? (
          <div
            className="hero-final-order-btn"
            aria-disabled="true"
            style={{
              opacity: 0.65,
              cursor: "not-allowed",
              pointerEvents: "none",
            }}
          >
            <span className="hero-final-cart">
              <ShoppingBag
                size={21}
                strokeWidth={2.3}
              />
            </span>

            <span className="hero-final-order-text">
              FERMÉ POUR CONGÉS
            </span>

            <span className="hero-final-arrow">
              —
            </span>
          </div>
        ) : (
          <Link
            href="/commander"
            className="hero-final-order-btn"
          >
            <span className="hero-final-cart">
              <ShoppingBag
                size={21}
                strokeWidth={2.3}
              />
            </span>

            <span className="hero-final-order-text">
              COMMANDER MAINTENANT
            </span>

            <span className="hero-final-arrow">
              →
            </span>
          </Link>
        )}
      </div>

      {/* ===============================
          RETRAIT
      =============================== */}

      <section
        className="pickup-card"
        id="retrait"
      >
        <div className="pickup-location">
          <span className="pickup-location-label">
            SO FRESH MONTPELLIER MILLÉNAIRE
          </span>

          <div className="pickup-store-card">
            <img
              src="/facade-sofresh.jpg"
              alt="Façade So Fresh Montpellier Millénaire"
              className="pickup-store-image"
            />

            <div className="pickup-store-info">
              <span>
                1350 avenue Albert Einstein,
                Montpellier
              </span>
            </div>

            <div className="pickup-contact-actions">
              <a
                href="tel:+33467859954"
                className="pickup-contact-btn"
              >
                <Phone
                  size={21}
                  strokeWidth={1.8}
                />
                <small>Appeler</small>
              </a>

              <a
                href="mailto:sofreshsalad@orange.fr"
                className="pickup-contact-btn"
              >
                <Mail
                  size={21}
                  strokeWidth={1.8}
                />
                <small>Contact</small>
              </a>

              <a
                href="https://www.google.com/maps/search/?api=1&query=1350+Avenue+Albert+Einstein+34000+Montpellier"
                target="_blank"
                rel="noopener noreferrer"
                className="pickup-contact-btn"
              >
                <MapPin
                  size={21}
                  strokeWidth={1.8}
                />
                <small>J'y vais</small>
              </a>
            </div>
          </div>
        </div>

        {/* ===============================
            FERMETURE OU RETRAIT
        =============================== */}

        {isClosureActiveToday ? (
          <div
            style={{
              marginTop: "16px",
              padding: "18px",
              borderRadius: "16px",
              background: "#fff8d8",
              border: "1px solid #dfd178",
              textAlign: "center",
            }}
          >
            <strong
              style={{
                display: "block",
                marginBottom: "8px",
                fontSize: "17px",
                color: "#1f2f1f",
              }}
            >
              So Fresh est temporairement fermé
            </strong>

            <p
              style={{
                margin: 0,
                lineHeight: 1.5,
                color: "#4a5647",
              }}
            >
              {settings?.closure_message ||
                "So Fresh est fermé pour congés. À très bientôt !"}
            </p>
          </div>
        ) : (
          <>
            {/* JOUR DE RETRAIT */}

            <h3>Jour de retrait</h3>

            <div className="pickup-days">
              {pickupDates.map(
                (date, index) => (
                  <button
                    key={date.iso}
                    type="button"
                    className={
                      selectedDay === index
                        ? "selected"
                        : ""
                    }
                    onClick={() =>
                      setSelectedDay(index)
                    }
                  >
                    <span>{date.label}</span>

                    <strong>{date.day}</strong>

                    <small>
                      {date.month
                        .charAt(0)
                        .toUpperCase() +
                        date.month.slice(1)}
                    </small>
                  </button>
                )
              )}
            </div>

            {/* HEURE DE RETRAIT */}

            <h3>Heure de retrait</h3>

            <div className="pickup-slots-wrapper">
              <div className="pickup-slots">
                {visibleSlots.map((time) => {
                  const full =
                    isSlotFull(time);

                  const past =
                    isPastSlot(time);

                  const disabled =
                    full || past;

                  return (
                    <button
                      key={time}
                      type="button"
                      disabled={disabled}
                      className={
                        full
                          ? "full"
                          : past
                          ? "past"
                          : `${formattedHour}h${formattedMinutes}` ===
                            time
                          ? "selected"
                          : ""
                      }
                      onClick={() => {
                        if (disabled) return;

                        const [h, m] =
                          time.split("h");

                        setHour(Number(h));
                        setMinutes(Number(m));
                      }}
                    >
                      {full
                        ? "Complet"
                        : time}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                className="pickup-more-slots"
                onClick={() =>
                  setShowAllSlots(
                    !showAllSlots
                  )
                }
              >
                {showAllSlots
                  ? "Réduire ↑"
                  : "Voir plus de créneaux ↓"}
              </button>
            </div>
          </>
        )}
      </section>

      {/* ===============================
          FIDÉLITÉ
      =============================== */}

      <section className="home-v2-loyalty">
        <div className="home-v2-loyalty-icon">
          ★
        </div>

        <div className="home-v2-loyalty-content">
          <strong>FIDÉLITÉ SO FRESH</strong>

          <span>
            Cumulez des points à chaque commande
            et profitez de récompenses.
          </span>
        </div>

        <Link
          href="/compte"
          className="home-v2-loyalty-link"
        >
          Découvrir
        </Link>
      </section>
    </main>
  );
}