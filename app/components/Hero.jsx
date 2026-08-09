"use client";

export default function Hero({
  loadingSettings,
  settings,
  serviceOpen,
  openDaysText,
  cutoffTimeText,
}) {
  return (
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
              ? `${openDaysText} · jusqu’à ${cutoffTimeText}`
              : "Click & Collect actuellement fermé"}
          </div>
        )}
      </div>
    </section>
  );
}
