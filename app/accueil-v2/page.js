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
  Mail,
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
      <section className="hero-final hero-final-home">
        <img
          src="/hero-sofresh.png"
          alt="So Fresh"
          className="hero-final-image"
        />

        <img
          src="/logo-carre.png"
          alt="So Fresh Salade"
          className="hero-final-logo"
        />

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
          <Link href="/commander" className="hero-final-order-btn">
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
            href="/commander?categorie=Salades"
            className="home-category-card"
          >
            <img src="/cat-salades.png" alt="Salades So Fresh" />
            <strong className="category-salades">Salades</strong>
          </Link>

          <Link
            href="/commander?categorie=Wraps"
            className="home-category-card"
          >
            <img src="/cat-wraps.png" alt="Wraps So Fresh" />
            <strong className="category-wraps">Wraps</strong>
          </Link>

          <Link
            href="/commander?categorie=Tacos"
            className="home-category-card"
          >
            <img src="/cat-tacos.png" alt="Tacos So Fresh" />
            <strong className="category-tacos">Tacos</strong>
          </Link>
        </div>
      </section>

      {/* RESTAURANT */}
      <section className="home-restaurant-card">
        <div className="home-restaurant-content">
          <img
            src="/facade-sofresh-new.png"
            alt="So Fresh Montpellier Millénaire"
            className="home-facade"
          />

          <div className="home-restaurant-info">
            <div className="home-restaurant-title">
              <MapPin size={30} fill="currentColor" />

              <div>
                <strong>SO FRESH MONTPELLIER MILLÉNAIRE</strong>
                <span>
                  1350 avenue Albert Einstein,
                  <br />
                  Montpellier
                </span>
              </div>
            </div>

            <div className="home-opening">
              <Clock3 size={26} />

              <div>
                <strong>Ouvert le midi</strong>
                <span>du lundi au vendredi</span>
              </div>
            </div>

            <div className="home-restaurant-actions">
              <a
                href="tel:+33467859954"
                className="home-restaurant-action"
              >
                <Phone size={24} />
                <strong>Téléphone</strong>
              </a>

              <a
                href="https://www.google.com/maps/search/?api=1&query=So+Fresh+Salade+1350+Avenue+Albert+Einstein+34000+Montpellier"
                target="_blank"
                rel="noopener noreferrer"
                className="home-restaurant-action"
              >
                <Navigation size={24} />
                <strong>Itinéraire</strong>
              </a>

              <a
                href="mailto:sofreshsalade@gmail.com"
                className="home-restaurant-action"
              >
                <Mail size={24} />
                <strong>E-mail</strong>
              </a>
            </div>
          </div>
        </div>

        {isClosureActiveToday && (
          <div className="home-closure-message">
            {settings?.closure_message ||
              "So Fresh est fermé pour congés. À très bientôt !"}
          </div>
        )}
      </section>

      {/* RACCOURCIS */}
      <section className="home-shortcuts">
        <Link href="/compte" className="home-shortcut loyalty">
          <div className="home-shortcut-icon">
            <Star size={28} />
          </div>

          <div className="home-shortcut-text">
            <strong>Ma fidélité</strong>
            <span>Suivre mes avantages et récompenses</span>
          </div>

          <ArrowRight className="home-shortcut-arrow" />
        </Link>

        <Link
          href="/compte/commandes"
          className="home-shortcut reorder"
        >
          <div className="home-shortcut-icon">
            <RotateCcw size={28} />
          </div>

          <div className="home-shortcut-text">
            <strong>Commander à nouveau</strong>
            <span>Retrouver mes dernières commandes</span>
          </div>

          <ArrowRight className="home-shortcut-arrow" />
        </Link>
      </section>

      {/* BANDEAU PRODUITS FRAIS */}
      <section className="home-fresh-banner">
        <img
          src="/cat-salades.png"
          alt=""
          className="home-fresh-image"
          aria-hidden="true"
        />

        <div className="home-fresh-content">
          <strong>
            Des produits frais,
            <br />
            une cuisine de saison
          </strong>
          <span className="home-fresh-line" />
        </div>
      </section>
    </main>
  );
}
