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

import styles from "./accueil-v2.module.css";

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
  ).padStart(2, "0")}-${String(parisToday.getUTCDate()).padStart(2, "0")}`;

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
    <main className={`home-v2 ${styles.page}`}>
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

      <section className={styles.restaurantCard}>
        <div className={styles.restaurantGrid}>
          <img
            src="/facade-sofresh-new.png"
            alt="So Fresh Montpellier Millénaire"
            className={styles.facade}
          />

          <div className={styles.restaurantInfo}>
            <div className={styles.restaurantTitle}>
              <MapPin size={28} fill="currentColor" />
              <div>
                <strong>SO FRESH MONTPELLIER MILLÉNAIRE</strong>
                <span>1350 avenue Albert Einstein, Montpellier</span>
              </div>
            </div>

            <div className={styles.opening}>
              <Clock3 size={24} />
              <div>
                <strong>Ouvert le midi</strong>
                <span>du lundi au vendredi</span>
              </div>
            </div>

            <div className={styles.actions}>
              <a href="tel:+33467859954" className={styles.action}>
                <Phone />
                <strong>Téléphone</strong>
              </a>

              <a
                href="https://www.google.com/maps/search/?api=1&query=So+Fresh+Salade+1350+Avenue+Albert+Einstein+34000+Montpellier"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.action}
              >
                <Navigation />
                <strong>Itinéraire</strong>
              </a>

              <a
                href="mailto:sofreshsalade@gmail.com"
                className={styles.action}
              >
                <Mail />
                <strong>E-mail</strong>
              </a>
            </div>
          </div>
        </div>

        {isClosureActiveToday && (
          <div className={styles.closure}>
            {settings?.closure_message ||
              "So Fresh est fermé pour congés. À très bientôt !"}
          </div>
        )}
      </section>

      <section className={styles.shortcuts}>
        <Link href="/compte" className={`${styles.shortcut} ${styles.loyalty}`}>
          <div className={styles.shortcutIcon}>
            <Star size={26} fill="currentColor" />
          </div>
          <div className={styles.shortcutText}>
            <strong>MA FIDÉLITÉ</strong>
            <span>Suivre mes avantages et récompenses</span>
          </div>
          <ArrowRight className={styles.shortcutArrow} />
        </Link>

        <Link
          href="/compte/commandes"
          className={`${styles.shortcut} ${styles.reorder}`}
        >
          <div className={styles.shortcutIcon}>
            <RotateCcw size={26} />
          </div>
          <div className={styles.shortcutText}>
            <strong>COMMANDER À NOUVEAU</strong>
            <span>Retrouver mes dernières commandes</span>
          </div>
          <ArrowRight className={styles.shortcutArrow} />
        </Link>
      </section>

      <div
        className={styles.freshBanner}
        role="img"
        aria-label="Des produits frais, une cuisine de saison"
      />
    </main>
  );
}
