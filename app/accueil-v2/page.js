"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  MapPin,
  ShoppingBag,
  Star,
  Clock3,
  Navigation,
  Phone,
  RotateCcw,
  ArrowRight,
} from "lucide-react";

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
        console.error("Erreur chargement paramètres :", error);
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
    Number(parisParts.find((part) => part.type === type)?.value);

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

  const closureEnabled = Boolean(settings?.closure_enabled);
  const closureStartDate = settings?.closure_start_date || "";
  const closureEndDate = settings?.closure_end_date || "";

  const isClosureActiveToday = Boolean(
    closureEnabled &&
      closureStartDate &&
      closureEndDate &&
      todayIso >= closureStartDate &&
      todayIso <= closureEndDate
  );

  return (
    <main className="home-v2">

      {/* FERMETURE */}

      {settings?.closure_enabled && (
        <div className="closure-marquee">
          <div className="closure-marquee-track">
            <span>
              {settings?.closure_message ||
                "So Fresh est fermé pour congés. À très bientôt !"}
            </span>
            <span>
              {settings?.closure_message ||
                "So Fresh est fermé pour congés. À très bientôt !"}
            </span>
          </div>
        </div>
      )}

      {/* HERO */}

      <section className="hero-final">
        <img
          src="/hero-sofresh.png"
          alt="Votre pause déjeuner So Fresh"
          className="hero-final-image"
        />

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
            <ShoppingBag size={24} />
            <span>FERMÉ POUR CONGÉS</span>
            <span>—</span>
          </div>
        ) : (
          <Link
            href="/commander"
            className="hero-final-order-btn"
          >
            <ShoppingBag size={24} />

            <span className="hero-final-order-text">
              COMMANDER MAINTENANT
            </span>

            <ArrowRight size={28} />
          </Link>
        )}
      </section>

      {/* NOS INCONTOURNABLES */}

      <section className="home-categories">

        <div className="home-section-heading">
          <div>
            <h2>Nos incontournables</h2>
            <span className="home-yellow-line" />
          </div>

          <Link href="/commander" className="home-full-menu">
            Voir toute la carte
            <ArrowRight size={22} />
          </Link>
        </div>

        <div className="home-category-grid">

          <Link
            href="/commander"
            className="home-category-card"
          >
            <img
              src="/cat-salades.png"
              alt="Salades So Fresh"
            />
            <strong className="category-salades">
              Salades
            </strong>
          </Link>

          <Link
            href="/commander"
            className="home-category-card"
          >
            <img
              src="/cat-wraps.png"
              alt="Wraps So Fresh"
            />
            <strong className="category-wraps">
              Wraps
            </strong>
          </Link>

          <Link
            href="/commander"
            className="home-category-card"
          >
            <img
              src="/cat-burgers.png"
              alt="Burgers So Fresh"
            />
            <strong className="category-burgers">
              Burgers
            </strong>
          </Link>

        </div>
      </section>

      {/* RESTAURANT */}

      <section className="home-restaurant-card">

        <div className="home-restaurant-top">

          <div className="home-restaurant-title">
            <MapPin size={30} fill="currentColor" />

            <div>
              <strong>
                SO FRESH MONTPELLIER MILLÉNAIRE
              </strong>

              <span>
                1350 avenue Albert Einstein, Montpellier
              </span>
            </div>
          </div>

          <div className="home-opening">
            <Clock3 size={28} />

            <div>
              <strong>Ouvert le midi</strong>
              <span>du lundi au vendredi</span>
            </div>
          </div>

        </div>

        <div className="home-restaurant-content">

          <img
            src="/facade1-sofresh.jpeg"
            alt="So Fresh Montpellier Millénaire"
            className="home-facade"
          />

          <div className="home-restaurant-actions">

            <a
              href="https://www.google.com/maps/search/?api=1&query=So+Fresh+Salade+1350+Avenue+Albert+Einstein+34000+Montpellier"
              target="_blank"
              rel="noopener noreferrer"
              className="home-restaurant-action"
            >
              <Navigation size={30} fill="currentColor" />
              <strong>Itinéraire</strong>
            </a>

            <a
              href="tel:+33467859954"
              className="home-restaurant-action"
            >
              <Phone size={30} />
              <strong>Nous contacter</strong>
            </a>

          </div>
        </div>

        {isClosureActiveToday && (
          <div className="home-closure-message">
            {settings?.closure_message ||
              "So Fresh est fermé pour congés. À très bientôt !"}
          </div>
        )}

      </section>

      {/* FIDÉLITÉ + COMMANDER À NOUVEAU */}

      <section className="home-shortcuts">

        <Link href="/compte" className="home-shortcut loyalty">

          <div className="home-shortcut-icon">
            <Star size={30} fill="currentColor" />
          </div>

          <div className="home-shortcut-text">
            <strong>MA FIDÉLITÉ</strong>
            <span>
              Suivre mes avantages
              <br />
              et récompenses
            </span>
          </div>

          <ArrowRight className="home-shortcut-arrow" />

        </Link>

        <Link
          href="/compte/commandes"
          className="home-shortcut reorder"
        >

          <div className="home-shortcut-icon">
            <RotateCcw size={30} />
          </div>

          <div className="home-shortcut-text">
            <strong>
              COMMANDER
              <br />
              À NOUVEAU
            </strong>

            <span>
              Retrouver mes
              <br />
              dernières commandes
            </span>
          </div>

          <ArrowRight className="home-shortcut-arrow" />

        </Link>

      </section>

      {/* BANDEAU FRAÎCHEUR */}

      <section className="home-fresh-banner">

        <div className="home-fresh-content">
          <div className="home-fresh-script">
            Des produits frais,
            <br />
            un quotidien plus sain !
          </div>

          <div className="home-fresh-line" />

          <div className="home-values">
            <span>🌿 Frais</span>
            <span>♡ Gourmand</span>
            <span>♧ Responsable</span>
          </div>
        </div>

        <img
          src="/cat-salades.png"
          alt=""
          className="home-fresh-image"
        />

      </section>

    </main>
  );
}