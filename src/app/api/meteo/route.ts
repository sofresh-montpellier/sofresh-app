import { NextResponse } from "next/server";

type DonneesMeteo = {
  latitude: number;
  longitude: number;
};

export async function POST(request: Request) {
  try {
    const body: DonneesMeteo =
      await request.json();

    const latitude =
      Number(body.latitude);

    const longitude =
      Number(body.longitude);

    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude)
    ) {
      return NextResponse.json(
        {
          erreur:
            "Coordonnées du jardin invalides.",
        },
        {
          status: 400,
        }
      );
    }

    const url =
      "https://api.open-meteo.com/v1/forecast" +
      `?latitude=${latitude}` +
      `&longitude=${longitude}` +
      "&current=temperature_2m" +
      "&hourly=precipitation" +
      "&daily=temperature_2m_max" +
      "&past_days=1" +
      "&forecast_days=2" +
      "&timezone=auto";

    const response =
      await fetch(url, {
        cache: "no-store",
      });

    if (!response.ok) {
      throw new Error(
        "Impossible de récupérer la météo."
      );
    }

    const data =
      await response.json();

    const heures: string[] =
      data.hourly?.time ?? [];

    const precipitations: number[] =
      data.hourly?.precipitation ?? [];

    const maintenant =
      new Date();

    const ilY24Heures =
      new Date(
        maintenant.getTime() -
          24 * 60 * 60 * 1000
      );

    const dans24Heures =
      new Date(
        maintenant.getTime() +
          24 * 60 * 60 * 1000
      );

    let pluieDernieres24h = 0;
    let pluieProchaines24h = 0;

    heures.forEach(
      (heure, index) => {
        const dateHeure =
          new Date(heure);

        const pluie =
          Number(
            precipitations[index] ?? 0
          );

        if (
          dateHeure >= ilY24Heures &&
          dateHeure < maintenant
        ) {
          pluieDernieres24h += pluie;
        }

        if (
          dateHeure >= maintenant &&
          dateHeure <= dans24Heures
        ) {
          pluieProchaines24h += pluie;
        }
      }
    );

    const temperatureActuelle =
      Number(
        data.current
          ?.temperature_2m
      );

    const temperatureMax =
      Number(
        data.daily
          ?.temperature_2m_max?.[0]
      );

    return NextResponse.json({
      temperatureActuelle,
      temperatureMax,

      pluieDernieres24h:
        Number(
          pluieDernieres24h.toFixed(1)
        ),

      pluieProchaines24h:
        Number(
          pluieProchaines24h.toFixed(1)
        ),
    });
  } catch (error) {
    console.error(
      "Erreur API météo :",
      error
    );

    return NextResponse.json(
      {
        erreur:
          "Impossible de récupérer la météo.",
      },
      {
        status: 500,
      }
    );
  }
}