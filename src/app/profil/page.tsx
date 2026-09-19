"use client";

import {
  ChangeEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  ArrowLeft,
  Bell,
  Camera,
  LogOut,
  MapPin,
  Save,
  Send,
  UserRound,
} from "lucide-react";
import { supabase } from "../lib/supabase";

function convertirCleVapid(cleBase64: string) {
  const padding = "=".repeat((4 - (cleBase64.length % 4)) % 4);

  const base64 = (cleBase64 + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const donneesBrutes = window.atob(base64);
  const tableau = new Uint8Array(donneesBrutes.length);

  for (let i = 0; i < donneesBrutes.length; i += 1) {
    tableau[i] = donneesBrutes.charCodeAt(i);
  }

  return tableau;
}

export default function ProfilPage() {
  const [email, setEmail] = useState("");
  const [villeJardin, setVilleJardin] = useState("");
  const [photoProfil, setPhotoProfil] = useState("");
  const [userId, setUserId] = useState("");

  const [chargement, setChargement] = useState(true);
  const [enregistrement, setEnregistrement] =
    useState(false);
  const [message, setMessage] = useState("");

  const [notificationsDisponibles, setNotificationsDisponibles] =
    useState(false);

  const [notificationsActivees, setNotificationsActivees] =
    useState(false);

  const [chargementNotifications, setChargementNotifications] =
    useState(false);

  const [messageNotifications, setMessageNotifications] =
    useState("");

  const [testNotificationEnCours, setTestNotificationEnCours] =
    useState(false);

  const inputPhotoRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function chargerProfil() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = "/connexion";
        return;
      }

      setUserId(user.id);
      setEmail(user.email ?? "");

      const { data, error } = await supabase
        .from("profils")
        .select("ville_jardin, photo_profil_url")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error(
          "Erreur chargement profil :",
          error
        );
      }

      if (data) {
        setVilleJardin(
          data.ville_jardin ?? ""
        );

        setPhotoProfil(
          data.photo_profil_url ?? ""
        );
      }

      await verifierNotifications();

      setChargement(false);
    }

    chargerProfil();
  }, []);

  async function verifierNotifications() {
    if (
      !("serviceWorker" in navigator) ||
      !("PushManager" in window) ||
      !("Notification" in window)
    ) {
      setNotificationsDisponibles(false);
      setNotificationsActivees(false);
      return;
    }

    setNotificationsDisponibles(true);

    try {
      const registration =
        await navigator.serviceWorker.ready;

      const abonnement =
        await registration.pushManager.getSubscription();

      setNotificationsActivees(
        Notification.permission === "granted" &&
          abonnement !== null
      );
    } catch (error) {
      console.error(
        "Erreur vérification notifications :",
        error
      );

      setNotificationsActivees(false);
    }
  }

  async function activerNotifications() {
    if (!userId) {
      return;
    }

    if (
      !("serviceWorker" in navigator) ||
      !("PushManager" in window) ||
      !("Notification" in window)
    ) {
      setMessageNotifications(
        "Les notifications ne sont pas disponibles sur cet appareil."
      );
      return;
    }

    const clePublique =
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

    if (!clePublique) {
      setMessageNotifications(
        "La configuration des notifications est incomplète."
      );
      return;
    }

    setChargementNotifications(true);
    setMessageNotifications("");

    try {
      const permission =
        await Notification.requestPermission();

      if (permission !== "granted") {
        setNotificationsActivees(false);

        setMessageNotifications(
          "Les notifications n'ont pas été autorisées."
        );

        setChargementNotifications(false);
        return;
      }

      const registration =
        await navigator.serviceWorker.ready;

      let abonnement =
        await registration.pushManager.getSubscription();

      if (!abonnement) {
        abonnement =
          await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey:
              convertirCleVapid(clePublique),
          });
      }

      const abonnementJson = abonnement.toJSON();

      const endpoint = abonnement.endpoint;
      const p256dh = abonnementJson.keys?.p256dh;
      const auth = abonnementJson.keys?.auth;

      if (!p256dh || !auth) {
        throw new Error(
          "Clés de l'abonnement push introuvables."
        );
      }

      const { error } = await supabase
        .from("push_subscriptions")
        .upsert(
          {
            user_id: userId,
            endpoint,
            p256dh,
            auth,
            user_agent: navigator.userAgent,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "endpoint",
          }
        );

      if (error) {
        throw error;
      }

      setNotificationsActivees(true);

      setMessageNotifications(
        "Notifications activées ✓"
      );
    } catch (error) {
      console.error(
        "Erreur activation notifications :",
        error
      );

      setNotificationsActivees(false);

      setMessageNotifications(
        "Impossible d'activer les notifications."
      );
    }

    setChargementNotifications(false);
  }

  async function desactiverNotifications() {
    if (!userId) {
      return;
    }

    setChargementNotifications(true);
    setMessageNotifications("");

    try {
      const registration =
        await navigator.serviceWorker.ready;

      const abonnement =
        await registration.pushManager.getSubscription();

      if (abonnement) {
        const endpoint = abonnement.endpoint;

        const { error } = await supabase
          .from("push_subscriptions")
          .delete()
          .eq("user_id", userId)
          .eq("endpoint", endpoint);

        if (error) {
          throw error;
        }

        await abonnement.unsubscribe();
      }

      setNotificationsActivees(false);

      setMessageNotifications(
        "Notifications désactivées."
      );
    } catch (error) {
      console.error(
        "Erreur désactivation notifications :",
        error
      );

      setMessageNotifications(
        "Impossible de désactiver les notifications."
      );
    }

    setChargementNotifications(false);
  }

  async function testerNotification() {
    if (!notificationsActivees) {
      return;
    }

    setTestNotificationEnCours(true);
    setMessageNotifications(
      "Envoi de la notification..."
    );

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setMessageNotifications(
          "Votre session Feuillia n'est plus valide."
        );

        setTestNotificationEnCours(false);
        return;
      }

      const response = await fetch(
        "/api/test-notification",
        {
          method: "POST",
          headers: {
            Authorization:
              `Bearer ${session.access_token}`,
          },
        }
      );

      const resultat = await response.json();

      if (!response.ok) {
        throw new Error(
          resultat.error ||
            "Impossible d'envoyer la notification."
        );
      }

      setMessageNotifications(
        `Notification envoyée ✓ (${resultat.nombreAppareils} appareil${
          resultat.nombreAppareils > 1 ? "s" : ""
        })`
      );
    } catch (error) {
      console.error(
        "Erreur test notification :",
        error
      );

      setMessageNotifications(
        "Impossible d'envoyer la notification."
      );
    }

    setTestNotificationEnCours(false);
  }

  function ouvrirChoixPhoto() {
    inputPhotoRef.current?.click();
  }

  async function changerPhoto(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const fichier = event.target.files?.[0];

    if (!fichier || !userId) {
      return;
    }

    setMessage("Envoi de la photo...");

    const extension =
      fichier.name.split(".").pop()?.toLowerCase() ??
      "jpg";

    const chemin = `${userId}/profil.${extension}`;

    const { error: erreurUpload } =
      await supabase.storage
        .from("photos-profils")
        .upload(chemin, fichier, {
          upsert: true,
          contentType: fichier.type,
        });

    if (erreurUpload) {
      console.error(
        "Erreur photo profil :",
        erreurUpload
      );

      setMessage(
        "Impossible d'enregistrer la photo."
      );

      return;
    }

    const {
      data: { publicUrl },
    } = supabase.storage
      .from("photos-profils")
      .getPublicUrl(chemin);

    const urlAvecCache =
      `${publicUrl}?v=${Date.now()}`;

    setPhotoProfil(urlAvecCache);

    const { error: erreurProfil } =
      await supabase.from("profils").upsert(
        {
          user_id: userId,
          photo_profil_url: urlAvecCache,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id",
        }
      );

    if (erreurProfil) {
      console.error(
        "Erreur sauvegarde photo :",
        erreurProfil
      );

      setMessage(
        "La photo a été envoyée mais le profil n'a pas été mis à jour."
      );

      return;
    }

    setMessage("Photo enregistrée ✓");

    event.target.value = "";
  }

  async function trouverCoordonnees(ville: string) {
    const url =
      `https://geocoding-api.open-meteo.com/v1/search?` +
      `name=${encodeURIComponent(ville)}` +
      `&count=1` +
      `&language=fr` +
      `&format=json`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(
        "Impossible de rechercher la ville."
      );
    }

    const data = await response.json();

    const resultat = data.results?.[0];

    if (!resultat) {
      throw new Error(
        "Ville introuvable."
      );
    }

    return {
      latitude: resultat.latitude,
      longitude: resultat.longitude,
      nom: resultat.name,
    };
  }

  async function enregistrerProfil() {
    if (!userId) {
      return;
    }

    const ville = villeJardin.trim();

    if (!ville) {
      setMessage(
        "Indiquez la ville de votre jardin."
      );

      return;
    }

    setEnregistrement(true);

    setMessage(
      "Recherche de la localisation..."
    );

    try {
      const localisation =
        await trouverCoordonnees(ville);

      const { error } = await supabase
        .from("profils")
        .upsert(
          {
            user_id: userId,
            ville_jardin: localisation.nom,
            latitude: localisation.latitude,
            longitude: localisation.longitude,
            photo_profil_url:
              photoProfil || null,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "user_id",
          }
        );

      if (error) {
        console.error(
          "Erreur sauvegarde profil :",
          error
        );

        setMessage(
          "Impossible d'enregistrer le profil."
        );

        setEnregistrement(false);
        return;
      }

      setVilleJardin(localisation.nom);

      setMessage(
        "Localisation enregistrée ✓"
      );
    } catch (error) {
      console.error(
        "Erreur localisation :",
        error
      );

      setMessage(
        "Ville introuvable. Vérifiez son nom."
      );
    }

    setEnregistrement(false);
  }

  async function seDeconnecter() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  return (
    <main className="min-h-screen bg-[#F7F5EE] text-[#1B4332]">
      <div className="mx-auto min-h-screen max-w-md px-6 py-8">
        <a
          href="/"
          aria-label="Retour"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-[#DDE5D8] bg-white"
        >
          <ArrowLeft size={20} />
        </a>

        <div className="mt-8 flex flex-col items-center">
          <input
            ref={inputPhotoRef}
            type="file"
            accept="image/*"
            onChange={changerPhoto}
            className="hidden"
          />

          <button
            type="button"
            onClick={ouvrirChoixPhoto}
            className="relative"
            aria-label="Changer la photo de profil"
          >
            <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-[#EEF5E9]">
              {photoProfil ? (
                <img
                  src={photoProfil}
                  alt="Photo de profil"
                  className="h-full w-full object-cover"
                />
              ) : (
                <UserRound
                  size={44}
                  className="text-[#5BA651]"
                />
              )}
            </div>

            <div className="absolute bottom-0 right-0 flex h-9 w-9 items-center justify-center rounded-full border-4 border-[#F7F5EE] bg-[#5BA651] text-white">
              <Camera size={17} />
            </div>
          </button>

          <p className="mt-3 text-xs text-gray-500">
            Touchez la photo pour la modifier
          </p>

          <p className="mt-6 text-sm font-medium text-[#5BA651]">
            Mon compte
          </p>

          <h1 className="mt-2 font-[family-name:var(--font-poppins)] text-3xl font-semibold">
            Mon profil
          </h1>

          <p className="mt-3 text-sm text-gray-500">
            {email}
          </p>
        </div>

        {chargement ? (
          <section className="mt-8 rounded-3xl bg-white p-6 shadow-sm">
            <p className="text-center text-sm text-gray-500">
              Chargement...
            </p>
          </section>
        ) : (
          <>
            <section className="mt-8 rounded-3xl bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#EEF5E9]">
                  <MapPin
                    size={21}
                    className="text-[#5BA651]"
                  />
                </div>

                <div>
                  <p className="font-semibold">
                    Localisation du jardin
                  </p>

                  <p className="text-xs text-gray-500">
                    Utilisée pour adapter les conseils à
                    la météo.
                  </p>
                </div>
              </div>

              <label
                htmlFor="villeJardin"
                className="mt-6 block text-sm font-medium"
              >
                Ville
              </label>

              <input
                id="villeJardin"
                type="text"
                value={villeJardin}
                onChange={(event) =>
                  setVilleJardin(
                    event.target.value
                  )
                }
                placeholder="Ex. Saint-Aunès"
                autoComplete="address-level2"
                className="mt-2 w-full rounded-2xl border border-[#DDE5D8] bg-[#FBFBF9] px-4 py-4 text-[#1B4332] outline-none transition focus:border-[#5BA651]"
              />

              <button
                type="button"
                onClick={enregistrerProfil}
                disabled={enregistrement}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#1B4332] py-4 font-semibold text-white disabled:opacity-60"
              >
                <Save size={19} />

                {enregistrement
                  ? "Enregistrement..."
                  : "Enregistrer"}
              </button>

              {message && (
                <p className="mt-4 text-center text-sm text-[#5BA651]">
                  {message}
                </p>
              )}
            </section>

            <section className="mt-6 rounded-3xl bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#EEF5E9]">
                  <Bell
                    size={21}
                    className="text-[#5BA651]"
                  />
                </div>

                <div>
                  <p className="font-semibold">
                    Notifications
                  </p>

                  <p className="text-xs text-gray-500">
                    Recevez les rappels importants pour
                    vos plantes.
                  </p>
                </div>
              </div>

              {!notificationsDisponibles ? (
                <p className="mt-5 text-sm text-gray-500">
                  Les notifications ne sont pas disponibles
                  sur cet appareil.
                </p>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={
                      notificationsActivees
                        ? desactiverNotifications
                        : activerNotifications
                    }
                    disabled={chargementNotifications}
                    className={`mt-5 flex w-full items-center justify-center gap-2 rounded-2xl py-4 font-semibold disabled:opacity-60 ${
                      notificationsActivees
                        ? "border border-[#DDE5D8] bg-[#FBFBF9] text-[#1B4332]"
                        : "bg-[#5BA651] text-white"
                    }`}
                  >
                    <Bell size={19} />

                    {chargementNotifications
                      ? "Patientez..."
                      : notificationsActivees
                        ? "Désactiver les notifications"
                        : "Activer les notifications"}
                  </button>

                  {notificationsActivees && (
                    <button
                      type="button"
                      onClick={testerNotification}
                      disabled={testNotificationEnCours}
                      className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#1B4332] py-4 font-semibold text-white disabled:opacity-60"
                    >
                      <Send size={18} />

                      {testNotificationEnCours
                        ? "Envoi..."
                        : "Tester une notification"}
                    </button>
                  )}
                </>
              )}

              {messageNotifications && (
                <p className="mt-4 text-center text-sm text-[#5BA651]">
                  {messageNotifications}
                </p>
              )}
            </section>
          </>
        )}

        <button
          type="button"
          onClick={seDeconnecter}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl border border-[#DDE5D8] bg-white py-4 font-semibold"
        >
          <LogOut size={20} />
          Se déconnecter
        </button>
      </div>
    </main>
  );
}