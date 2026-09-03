import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const apiKey = process.env.PLANTNET_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "Clé API Pl@ntNet absente." },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const photo = formData.get("photo");

    if (!(photo instanceof File)) {
      return NextResponse.json(
        { error: "Aucune photo reçue." },
        { status: 400 }
      );
    }

    const plantnetFormData = new FormData();
    plantnetFormData.append("images", photo);
    plantnetFormData.append("organs", "auto");

    const response = await fetch(
      `https://my-api.plantnet.org/v2/identify/all?api-key=${apiKey}&lang=fr&nb-results=3`,
      {
        method: "POST",
        body: plantnetFormData,
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Erreur Pl@ntNet :", data);

      return NextResponse.json(
        { error: "Erreur lors de l'identification." },
        { status: response.status }
      );
    }

    const meilleurResultat = data.results?.[0];

    if (!meilleurResultat) {
      return NextResponse.json(
        { error: "Aucune plante reconnue." },
        { status: 404 }
      );
    }

    const nomCommun =
      meilleurResultat.species?.commonNames?.[0] ??
      meilleurResultat.species?.scientificNameWithoutAuthor ??
      "Plante inconnue";

    const nomBotanique =
      meilleurResultat.species?.scientificNameWithoutAuthor ??
      data.bestMatch ??
      "Nom botanique inconnu";

    const score = meilleurResultat.score ?? 0;

    return NextResponse.json({
      nomCommun,
      nomBotanique,
      confiance: `${Math.round(score * 100)} %`,
    });
  } catch (error) {
    console.error("Erreur serveur :", error);

    return NextResponse.json(
      { error: "Erreur serveur." },
      { status: 500 }
    );
  }
}