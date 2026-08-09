"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Phone, Mail, MapPin } from "lucide-react";

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

  const first = parseTimeToMinutes(settings.first_pickup_time);
  const last = parseTimeToMinutes(settings.last_pickup_time);
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
      `${String(h).padStart(2, "0")}h${String(m).padStart(2, "0")}`
    );
  }

  return times;
}
export default function AccueilV2() {
  const [settings, setSettings] = useState(null);

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
      console.error("Erreur chargement horaires :", error);
    }
  }

  loadSettings();
}, []);
  const [hour, setHour] = useState(12);
  const [minutes, setMinutes] = useState(15);
  const [selectedDay, setSelectedDay] = useState(0);
  const [showAllSlots, setShowAllSlots] = useState(false);
const [availability, setAvailability] = useState({
  capacity: 0,
  counts: {},
});
useEffect(() => {
  async function loadAvailability() {
    try {
      const selectedDate = pickupDates[selectedDay]?.iso;

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
      console.error("Erreur chargement disponibilités :", error);
    }
  }

  loadAvailability();
}, [selectedDay]);
  /* ===============================
     DATES AUTOMATIQUES
  =============================== */

  const now = new Date();

  const parisParts = new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(now);

  const getPart = (type) =>
    Number(parisParts.find((part) => part.type === type)?.value);

  const parisToday = new Date(
    Date.UTC(
      getPart("year"),
      getPart("month") - 1,
      getPart("day"),
      12
    )
  );

  const pickupDates = [0, 1, 2].map((offset) => {
    const date = new Date(parisToday);
    date.setUTCDate(parisToday.getUTCDate() + offset);

    let label;

    if (offset === 0) {
      label = "Aujourd'hui";
    } else if (offset === 1) {
      label = "Demain";
    } else {
      label = new Intl.DateTimeFormat("fr-FR", {
        weekday: "short",
        timeZone: "UTC",
      }).format(date);
    }

    return {
  label,

  iso: `${date.getUTCFullYear()}-${String(
    date.getUTCMonth() + 1
  ).padStart(2, "0")}-${String(
    date.getUTCDate()
  ).padStart(2, "0")}`,

  day: String(date.getUTCDate()).padStart(2, "0"),

  month: new Intl.DateTimeFormat("fr-FR", {
    month: "long",
    timeZone: "UTC",
  }).format(date),
};
});
  const formattedHour = String(hour).padStart(2, "0");
  const formattedMinutes = String(minutes).padStart(2, "0");

  /* ===============================
     CRENEAUX HORAIRES
  =============================== */

 const allSlots = generatePickupTimes(settings);

const visibleSlots = showAllSlots
  ? allSlots
  : allSlots.slice(0, 6);
  const isSlotFull = (time) => {
  const capacity = Number(availability.capacity || 0);

  if (capacity <= 0) return false;

  // L'API Commander peut utiliser "12 h 00"
  // alors que l'accueil affiche "12h00"
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
};
useEffect(() => {
  const selectedDate = pickupDates[selectedDay]?.iso;

  if (!selectedDate) return;

  localStorage.setItem("sofresh_pickup_date", selectedDate);
  localStorage.setItem(
    "sofresh_pickup_time",
    `${formattedHour} h ${formattedMinutes}`
  );
}, [selectedDay, formattedHour, formattedMinutes]);
  return (
    <main className="home-v2">

      {/* ===============================
          BANDEAU FIXE
      =============================== */}

      
 {/* ===============================
          VISUEL SO FRESH
      =============================== */}

      <section className="home-v2-hero">

        <div className="home-v2-hero-overlay" />

        <div className="home-v2-hero-content">

          <h1>
            FRAIS,
            <br />
            TOUS LES
            <br />
            JOURS
          </h1>

        </div>

      </section>

      {/* ===============================
          RETRAIT
      =============================== */}

      <section className="pickup-card">

        <div className="pickup-location">

          <span className="pickup-location-label">
            RETRAIT CHEZ SO FRESH
          </span>

          <strong>Millénaire, Montpellier</strong>

          {/* CONTACT */}

          <div className="pickup-contact-actions">

            <a
              href="tel:+33467859954"
              className="pickup-contact-btn"
            >
              <Phone size={22} strokeWidth={1.8} />
              <small>Appeler</small>
            </a>

            <a
              href="mailto:sofreshsalad@orange.fr"
              className="pickup-contact-btn"
            >
              <Mail size={22} strokeWidth={1.8} />
              <small>Contact</small>
            </a>

            <a
              href="https://www.google.com/maps/search/?api=1&query=1350+Avenue+Albert+Einstein+34000+Montpellier"
              target="_blank"
              rel="noopener noreferrer"
              className="pickup-contact-btn pickup-contact-map"
            >
              <MapPin size={22} strokeWidth={1.8} />
              <small>J'y vais</small>
            </a>

          </div>

        </div>

        {/* ===============================
            JOUR DE RETRAIT
        =============================== */}

        <h3>Jour de retrait</h3>

        <div className="pickup-days">

          {pickupDates.map((date, index) => (
            <button
              key={index}
              type="button"
              className={selectedDay === index ? "selected" : ""}
              onClick={() => setSelectedDay(index)}
            >
              <span>{date.label}</span>

              <strong>{date.day}</strong>

              <small>
                {date.month.charAt(0).toUpperCase() +
                  date.month.slice(1)}
              </small>
            </button>
          ))}

        </div>

        {/* ===============================
            HEURE DE RETRAIT
        =============================== */}

        <h3>Heure de retrait</h3>

        <div className="pickup-slots-wrapper">

          <div className="pickup-slots">

           {visibleSlots.map((time) => {
  const full = isSlotFull(time);

  return (
    <button
      key={time}
      type="button"
      disabled={full}
      className={
        full
          ? "full"
          : `${formattedHour}h${formattedMinutes}` === time
          ? "selected"
          : ""
      }
      onClick={() => {
        if (full) return;

        const [h, m] = time.split("h");
        setHour(Number(h));
        setMinutes(Number(m));
      }}
    >
      {full ? "Complet" : time}
    </button>
  );
})}

          </div>

          <button
            type="button"
            className="pickup-more-slots"
            onClick={() => setShowAllSlots(!showAllSlots)}
          >
            {showAllSlots
              ? "Réduire ↑"
              : "Voir plus de créneaux ↓"}
          </button>

        </div>

      </section>

     
      {/* ===============================
          COMMANDER
      =============================== */}

      <Link
        href="/commander"
        className="home-v2-main-order"
      >
        COMMANDER MAINTENANT
      </Link>

      {/* ===============================
          FIDELITE
      =============================== */}

      <section className="home-v2-loyalty">

        <div className="home-v2-loyalty-icon">
          ★
        </div>

        <div className="home-v2-loyalty-content">

          <strong>FIDÉLITÉ SO FRESH</strong>

          <span>
            Cumulez des points à chaque commande et profitez
            de récompenses.
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