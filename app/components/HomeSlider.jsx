"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";

const slides = [
  {
    image: "/slider-1.jpg",
    title: "Le burger du moment",
    text: "Une recette généreuse, préparée avec soin.",
  },
  {
    image: "/slider-2.jpg",
    title: "Fraîcheur à chaque bouchée",
    text: "Salades, wraps et plats frais pour votre pause déjeuner.",
  },
];

export default function HomeSlider() {
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setCurrentSlide((current) =>
        current === slides.length - 1
          ? 0
          : current + 1
      );
    }, 4500);

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  return (
    <section className="home-slider">
      <div
        className="home-slider-track"
        style={{
          transform: `translateX(-${currentSlide * 100}%)`,
        }}
      >
        {slides.map((slide) => (
          <article
            className="home-slide"
            key={slide.image}
          >
            <Image
              src={slide.image}
              alt={slide.title}
              fill
              sizes="(max-width: 800px) 100vw, 1100px"
              className="home-slide-image"
            />

            <div className="home-slide-overlay" />

            <div className="home-slide-content">
              <span>NOUVEAUTÉ SO FRESH</span>

              <h2>{slide.title}</h2>

              <p>{slide.text}</p>

              <Link
                href="/commander"
                className="home-slide-button"
              >
                Découvrir
              </Link>
            </div>
          </article>
        ))}
      </div>

      <div className="home-slider-dots">
        {slides.map((slide, index) => (
          <button
            type="button"
            key={slide.image}
            className={
              currentSlide === index
                ? "active"
                : ""
            }
            onClick={() => setCurrentSlide(index)}
            aria-label={`Afficher la photo ${index + 1}`}
          />
        ))}
      </div>
    </section>
  );
}