"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";

const defaultSettings = {
  restaurantOpen: true,
  cutoffTime: "11:00",
  firstPickupTime: "11:30",
  lastPickupTime: "13:30",
  slotInterval: "15",
  slotCapacity: "10",
  openMonday: true,
  openTuesday: true,
  openWednesday: true,
  openThursday: true,
  openFriday: true,
  openSaturday: false,
  openSunday: false,
};

const days = [
  ["openMonday", "Lundi"],
  ["openTuesday", "Mardi"],
  ["openWednesday", "Mercredi"],
  ["openThursday", "Jeudi"],
  ["openFriday", "Vendredi"],
  ["openSaturday", "Samedi"],
  ["openSunday", "Dimanche"],
];

function convertDatabaseToForm(data) {
  return {
    restaurantOpen: data.restaurant_open ?? true,
    cutoffTime: data.cutoff_time || "11:00",
    firstPickupTime: data.first_pickup_time || "11:30",
    lastPickupTime: data.last_pickup_time || "13:30",
    slotInterval: String(data.slot_interval ?? 15),
    slotCapacity: String(data.slot_capacity ?? 10),
    openMonday: data.open_monday ?? true,
    openTuesday: data.open_tuesday ?? true,
    openWednesday: data.open_wednesday ?? true,
    openThursday: data.open_thursday ?? true,
    openFriday: data.open_friday ?? true,
    openSaturday: data.open_saturday ?? false,
    openSunday: data.open_sunday ?? false,
  };
}

function convertFormToDatabase(settings) {
  return {
    id: 1,
    restaurant_open: Boolean(settings.restaurantOpen),
    cutoff_time: settings.cutoffTime,
    first_pickup_time: settings.firstPickupTime,
    last_pickup_time: settings.lastPickupTime,
    slot_interval: Number(settings.slotInterval),
    slot_capacity: Number(settings.slotCapacity),
    open_monday: Boolean(settings.openMonday),
    open_tuesday: Boolean(settings.openTuesday),
    open_wednesday: Boolean(settings.openWednesday),
    open_thursday: Boolean(settings.openThursday),
    open_friday: Boolean(settings.openFriday),
    open_saturday: Boolean(settings.openSaturday),
    open_sunday: Boolean(settings.openSunday),
  };
}

export default function SettingsPage() {
  const [settings, setSettings] = useState(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    async function loadSettings() {
      setLoading(true);
      setMessage("");
      setHasError(false);

      const { data, error } = await supabase
        .from("settings")
        .select("*")
        .eq("id", 1)
        .single();

      if (error) {
        console.error(
          "Erreur de chargement des paramètres :",
          error
        );

        setHasError(true);
        setMessage(
          "Impossible de charger les paramètres depuis Supabase."
        );
        setLoading(false);
        return;
      }

      setSettings(convertDatabaseToForm(data));
      setLoading(false);
    }

    loadSettings();
  }, []);

  function updateSetting(name, value) {
    setSettings((currentSettings) => ({
      ...currentSettings,
      [name]: value,
    }));

    setMessage("");
    setHasError(false);
  }

  async function saveSettings(event) {
    event.preventDefault();

    setMessage("");
    setHasError(false);

    const slotInterval = Number(settings.slotInterval);
    const slotCapacity = Number(settings.slotCapacity);

    if (
      !settings.cutoffTime ||
      !settings.firstPickupTime ||
      !settings.lastPickupTime
    ) {
      setHasError(true);
      setMessage("Tous les horaires doivent être renseignés.");
      return;
    }

    if (
      !Number.isInteger(slotInterval) ||
      slotInterval < 1 ||
      slotInterval > 120
    ) {
      setHasError(true);
      setMessage("L’intervalle des créneaux est invalide.");
      return;
    }

    if (
      !Number.isInteger(slotCapacity) ||
      slotCapacity < 1 ||
      slotCapacity > 50
    ) {
      setHasError(true);
      setMessage(
        "La capacité doit être comprise entre 1 et 50 commandes."
      );
      return;
    }

    setSaving(true);

    const { error } = await supabase
      .from("settings")
      .upsert(convertFormToDatabase(settings), {
        onConflict: "id",
      });

    setSaving(false);

    if (error) {
      console.error(
        "Erreur d’enregistrement des paramètres :",
        error
      );

      setHasError(true);
      setMessage(
        "Les paramètres n’ont pas pu être enregistrés dans Supabase."
      );
      return;
    }

    setHasError(false);
    setMessage("Paramètres enregistrés dans Supabase.");
  }

  async function resetSettings() {
    const confirmed = window.confirm(
      "Rétablir les paramètres par défaut ?"
    );

    if (!confirmed) {
      return;
    }

    setSaving(true);
    setMessage("");
    setHasError(false);

    const { error } = await supabase
      .from("settings")
      .upsert(convertFormToDatabase(defaultSettings), {
        onConflict: "id",
      });

    setSaving(false);

    if (error) {
      console.error(
        "Erreur de réinitialisation :",
        error
      );

      setHasError(true);
      setMessage(
        "Les paramètres par défaut n’ont pas pu être enregistrés."
      );
      return;
    }

    setSettings(defaultSettings);
    setMessage("Paramètres par défaut rétablis.");
  }

  if (loading) {
    return (
      <main className="admin-wrap settings-page">
        <section className="settings-main-panel">
          <div className="settings-page-heading">
            <span className="settings-eyebrow">
              Paramètres
            </span>

            <h1>Réglages Click & Collect</h1>

            <p>Chargement des paramètres…</p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="admin-wrap settings-page">
      <section className="settings-main-panel">
        <div className="settings-page-heading">
          <span className="settings-eyebrow">
            Paramètres
          </span>

          <h1>Réglages Click & Collect</h1>

          <p>
            Gérez les jours d’ouverture, les horaires de
            retrait et la capacité des créneaux.
          </p>
        </div>

        <form onSubmit={saveSettings}>
          <section className="settings-section-card">
            <div className="settings-section-heading">
              <div>
                <h2>État du service</h2>

                <p>
                  Fermez temporairement les commandes sans
                  modifier les produits.
                </p>
              </div>

              <label className="settings-switch">
                <input
                  type="checkbox"
                  checked={settings.restaurantOpen}
                  onChange={(event) =>
                    updateSetting(
                      "restaurantOpen",
                      event.target.checked
                    )
                  }
                />

                <span className="settings-switch-slider" />

                <b>
                  {settings.restaurantOpen
                    ? "Commandes ouvertes"
                    : "Commandes fermées"}
                </b>
              </label>
            </div>
          </section>

          <section className="settings-section-card">
            <div className="settings-section-heading">
              <div>
                <h2>Jours d’ouverture</h2>

                <p>
                  Sélectionnez les jours où les clients
                  peuvent commander.
                </p>
              </div>
            </div>

            <div className="settings-days-grid">
              {days.map(([key, label]) => (
                <label
                  className={`settings-day ${
                    settings[key] ? "selected" : ""
                  }`}
                  key={key}
                >
                  <input
                    type="checkbox"
                    checked={settings[key]}
                    onChange={(event) =>
                      updateSetting(
                        key,
                        event.target.checked
                      )
                    }
                  />

                  <span className="settings-day-check">
                    {settings[key] ? "✓" : ""}
                  </span>

                  <span>{label}</span>
                </label>
              ))}
            </div>
          </section>

          <section className="settings-section-card">
            <div className="settings-section-heading">
              <div>
                <h2>Horaires</h2>

                <p>
                  Définissez l’heure limite de commande et
                  les horaires de retrait.
                </p>
              </div>
            </div>

            <div className="settings-form-grid">
              <div>
                <label htmlFor="cutoff-time">
                  Heure limite de commande
                </label>

                <input
                  id="cutoff-time"
                  type="time"
                  value={settings.cutoffTime}
                  onChange={(event) =>
                    updateSetting(
                      "cutoffTime",
                      event.target.value
                    )
                  }
                />
              </div>

              <div>
                <label htmlFor="first-pickup-time">
                  Premier retrait
                </label>

                <input
                  id="first-pickup-time"
                  type="time"
                  value={settings.firstPickupTime}
                  onChange={(event) =>
                    updateSetting(
                      "firstPickupTime",
                      event.target.value
                    )
                  }
                />
              </div>

              <div>
                <label htmlFor="last-pickup-time">
                  Dernier retrait
                </label>

                <input
                  id="last-pickup-time"
                  type="time"
                  value={settings.lastPickupTime}
                  onChange={(event) =>
                    updateSetting(
                      "lastPickupTime",
                      event.target.value
                    )
                  }
                />
              </div>

              <div>
                <label htmlFor="slot-interval">
                  Intervalle entre les créneaux
                </label>

                <select
                  id="slot-interval"
                  value={settings.slotInterval}
                  onChange={(event) =>
                    updateSetting(
                      "slotInterval",
                      event.target.value
                    )
                  }
                >
                  <option value="10">
                    Toutes les 10 minutes
                  </option>

                  <option value="15">
                    Toutes les 15 minutes
                  </option>

                  <option value="20">
                    Toutes les 20 minutes
                  </option>

                  <option value="30">
                    Toutes les 30 minutes
                  </option>
                </select>
              </div>

              <div>
                <label htmlFor="slot-capacity">
                  Commandes maximum par créneau
                </label>

                <input
                  id="slot-capacity"
                  type="number"
                  min="1"
                  max="50"
                  value={settings.slotCapacity}
                  onChange={(event) =>
                    updateSetting(
                      "slotCapacity",
                      event.target.value
                    )
                  }
                />
              </div>
            </div>
          </section>

          <section className="settings-actions-card">
            <div className="settings-actions-buttons">
              <button
                className="primary"
                type="submit"
                disabled={saving}
              >
                {saving
                  ? "Enregistrement…"
                  : "Enregistrer les paramètres"}
              </button>

              <button
                className="secondary"
                type="button"
                onClick={resetSettings}
                disabled={saving}
              >
                Rétablir les valeurs par défaut
              </button>
            </div>

            {message && (
              <div
                className={
                  hasError
                    ? "message"
                    : "settings-success"
                }
              >
                <span>{hasError ? "!" : "✓"}</span>

                {message}
              </div>
            )}
          </section>
        </form>
      </section>
    </main>
  );
}
