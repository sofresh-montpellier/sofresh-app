import { NextResponse } from "next/server";

type SerieMeteo = {
  time?: number[];
  temperature_2m?: (number | null)[];
  precipitation?: (number | null)[];
  rain?: (number | null)[];
  et0_fao_evapotranspiration?: (number | null)[];
};

type ReponseMeteo = {
  latitude?: number;
  longitude?: number;
  timezone?: string;
  utc_offset_seconds?: number;
  current?: {
    time?: number;
    temperature_2m?: number | null;
    precipitation?: number | null;
    rain?: number | null;
    wind_speed_10m?: number | null;
  };
  hourly?: SerieMeteo;
  minutely_15?: SerieMeteo;
  daily?: {
    time?: number[];
    temperature_2m_max?: (number | null)[];
    temperature_2m_min?: (number | null)[];
    et0_fao_evapotranspiration?: (number | null)[];
  };
};

function nombre(valeur: unknown): number | null {
  if (typeof valeur !== "number" && typeof valeur !== "string") return null;
  if (typeof valeur === "string" && valeur.trim() === "") return null;
  const resultat = Number(valeur);
  return Number.isFinite(resultat) ? resultat : null;
}

function obligatoire(valeur: unknown): number {
  const resultat = nombre(valeur);
  if (resultat === null) throw new Error("Données météo incomplètes.");
  return resultat;
}

function arrondir(valeur: number, decimales = 1) {
  return Number(valeur.toFixed(decimales));
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ erreur: "Requête JSON invalide." }, { status: 400 });
  }

  const coordonnees = body && typeof body === "object"
    ? body as Record<string, unknown>
    : {};
  const latitude = nombre(coordonnees.latitude);
  const longitude = nombre(coordonnees.longitude);
  if (latitude === null || longitude === null ||
      latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return NextResponse.json(
      { erreur: "Coordonnées du jardin invalides." }, { status: 400 }
    );
  }

  try {
    const params = new URLSearchParams({
      latitude: String(latitude),
      longitude: String(longitude),
      current: "temperature_2m,precipitation,rain,wind_speed_10m",
      minutely_15: "precipitation,rain",
      hourly: "temperature_2m,precipitation,et0_fao_evapotranspiration",
      daily: "temperature_2m_max,temperature_2m_min,et0_fao_evapotranspiration",
      past_days: "1",
      forecast_days: "3",
      past_minutely_15: "4",
      forecast_minutely_15: "8",
      timezone: "auto",
      // Les timestamps UNIX sont des instants UTC, indépendants du serveur.
      timeformat: "unixtime",
      temperature_unit: "celsius",
      wind_speed_unit: "kmh",
      precipitation_unit: "mm",
    });

    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?${params}`, {
        cache: "no-store",
        signal: AbortSignal.timeout(15000),
      }
    );
    if (!response.ok) throw new Error(`Erreur météo HTTP ${response.status}`);
    const data: ReponseMeteo = await response.json();

    const maintenant = new Date();
    const instant = maintenant.getTime() / 1000;
    const debut = instant - 86400;
    const fin = instant + 86400;
    const heures = data.hourly?.time ?? [];
    const precipitations = data.hourly?.precipitation ?? [];
    const et0Horaire = data.hourly?.et0_fao_evapotranspiration ?? [];
    const temperatures = data.hourly?.temperature_2m ?? [];

    let pluieDernieres24h = 0;
    let pluieProchaines24h = 0;
    let et0Dernieres24h = 0;
    let et0Prochaines24h = 0;
    let nombreHeuresPassees = 0;
    let nombreHeuresFutures = 0;
    let temperatureMinProchaines24h: number | null = null;
    let heureTemperatureMinProchaines24h: string | null = null;
    let temperaturesCompletes = true;
    const previsionsTemperature24h: { heure: string; temperature: number }[] = [];

    heures.forEach((heure, index) => {
      if (!Number.isFinite(heure)) return;
      if (heure > debut && heure <= instant) {
        pluieDernieres24h += obligatoire(precipitations[index]);
        et0Dernieres24h += obligatoire(et0Horaire[index]);
        nombreHeuresPassees++;
      }
      if (heure > instant && heure <= fin) {
        pluieProchaines24h += obligatoire(precipitations[index]);
        et0Prochaines24h += obligatoire(et0Horaire[index]);
        nombreHeuresFutures++;
      }
      // Températures instantanées : ne pas utiliser le minimum déjà passé du jour.
      if (heure >= instant && heure <= fin) {
        const temperature = nombre(temperatures[index]);
        if (temperature === null) {
          temperaturesCompletes = false;
          return;
        }
        const heureISO = new Date(heure * 1000).toISOString();
        previsionsTemperature24h.push({ heure: heureISO, temperature });
        if (temperatureMinProchaines24h === null || temperature < temperatureMinProchaines24h) {
          temperatureMinProchaines24h = temperature;
          heureTemperatureMinProchaines24h = heureISO;
        }
      }
    });

    if (nombreHeuresPassees !== 24 || nombreHeuresFutures !== 24) {
      throw new Error("Couverture météo horaire incomplète.");
    }
    const froidPrevisionsDisponibles = temperaturesCompletes &&
      previsionsTemperature24h.length >= 24 &&
      new Set(previsionsTemperature24h.map(p => p.heure)).size === previsionsTemperature24h.length;
    if (!froidPrevisionsDisponibles) {
      temperatureMinProchaines24h = null;
      heureTemperatureMinProchaines24h = null;
      previsionsTemperature24h.length = 0;
    }

    const temperatureActuelle = obligatoire(data.current?.temperature_2m);
    const precipitationCurrent = obligatoire(data.current?.precipitation);
    const pluieCurrent = obligatoire(data.current?.rain);
    const vitesseVentActuelle = obligatoire(data.current?.wind_speed_10m);
    const heureMeteo = obligatoire(data.current?.time);
    const decalage = obligatoire(data.utc_offset_seconds);
    const timezone = data.timezone ?? "UTC";
    const formatLocal = new Intl.DateTimeFormat("sv-SE", {
      timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", hourCycle: "h23",
    });
    const heureLocale = (heure: number) => formatLocal.format(new Date(heure * 1000)).replace(" ", "T");
    const dateLocaleActuelle = heureLocale(instant).slice(0, 10);
    const indexAujourdhui = (data.daily?.time ?? []).findIndex(heure =>
      new Date((heure + decalage) * 1000).toISOString().slice(0, 10) === dateLocaleActuelle
    );
    if (indexAujourdhui < 0) throw new Error("Journée actuelle absente des données météo.");

    const temperatureMax = obligatoire(data.daily?.temperature_2m_max?.[indexAujourdhui]);
    const temperatureMin = obligatoire(data.daily?.temperature_2m_min?.[indexAujourdhui]);
    const et0Aujourdhui = obligatoire(data.daily?.et0_fao_evapotranspiration?.[indexAujourdhui]);

    let precipitationProche = 0;
    let pluieProche = 0;
    const diagnosticPluie15Min = (data.minutely_15?.time ?? [])
      .filter(heure => Number.isFinite(heure))
      .map(heure => {
        const index = data.minutely_15!.time!.indexOf(heure);
        const precipitation = nombre(data.minutely_15?.precipitation?.[index]);
        const pluie = nombre(data.minutely_15?.rain?.[index]);
        if (heure >= instant - 1800 && heure <= instant + 900) {
          precipitationProche += precipitation ?? 0;
          pluieProche += pluie ?? 0;
        }
        return { heure: heureLocale(heure), precipitation, pluie };
      });

    return NextResponse.json({
      temperatureActuelle,
      temperatureMax,
      temperatureMin,
      // Nouveaux champs : dates ISO UTC, à afficher avec le fuseau du jardin.
      temperatureMinProchaines24h,
      heureTemperatureMinProchaines24h,
      previsionsTemperature24h,
      froidPrevisionsDisponibles,
      timezone,
      dateActualisation: maintenant.toISOString(),
      precipitationActuelle: arrondir(Math.max(precipitationCurrent, precipitationProche), 2),
      pluieActuelle: arrondir(Math.max(pluieCurrent, pluieProche), 2),
      pluieDernieres24h: arrondir(pluieDernieres24h),
      pluieProchaines24h: arrondir(pluieProchaines24h),
      vitesseVentActuelle: arrondir(vitesseVentActuelle),
      et0Aujourdhui: arrondir(et0Aujourdhui),
      et0Dernieres24h: arrondir(et0Dernieres24h),
      et0Prochaines24h: arrondir(et0Prochaines24h),
      diagnostic: {
        latitudeDemandee: latitude,
        longitudeDemandee: longitude,
        latitudeUtilisee: data.latitude,
        longitudeUtilisee: data.longitude,
        heureServeur: maintenant.toISOString(),
        heureMeteo: heureLocale(heureMeteo),
        precipitationCurrent,
        pluieCurrent,
        precipitationProche: arrondir(precipitationProche, 2),
        pluieProche: arrondir(pluieProche, 2),
        diagnosticPluie15Min,
      },
    });
  } catch (error) {
    console.error("Erreur API météo :", error);
    return NextResponse.json(
      { erreur: "Impossible de récupérer la météo." }, { status: 500 }
    );
  }
}
