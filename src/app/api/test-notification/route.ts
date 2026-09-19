import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL;

    const supabaseKey =
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    const vapidPublicKey =
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

    const vapidPrivateKey =
      process.env.VAPID_PRIVATE_KEY;

    if (
      !supabaseUrl ||
      !supabaseKey ||
      !vapidPublicKey ||
      !vapidPrivateKey
    ) {
      return NextResponse.json(
        {
          error:
            "Configuration des notifications incomplète.",
        },
        { status: 500 }
      );
    }

    const authorization =
      request.headers.get("authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return NextResponse.json(
        {
          error: "Authentification requise.",
        },
        { status: 401 }
      );
    }

    const accessToken =
      authorization.substring("Bearer ".length);

    /*
     * IMPORTANT :
     * ce client Supabase utilise directement le token
     * de l'utilisateur connecté.
     *
     * Ainsi, les règles RLS de push_subscriptions
     * reconnaissent correctement auth.uid().
     */
    const supabase = createClient(
      supabaseUrl,
      supabaseKey,
      {
        global: {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    const {
      data: { user },
      error: erreurUtilisateur,
    } = await supabase.auth.getUser();

    if (erreurUtilisateur || !user) {
      return NextResponse.json(
        {
          error: "Session utilisateur invalide.",
        },
        { status: 401 }
      );
    }

    const {
      data: abonnements,
      error: erreurAbonnements,
    } = await supabase
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("user_id", user.id);

    if (erreurAbonnements) {
      console.error(
        "Erreur lecture push_subscriptions :",
        erreurAbonnements
      );

      return NextResponse.json(
        {
          error:
            "Impossible de lire les appareils enregistrés.",
        },
        { status: 500 }
      );
    }

    if (!abonnements || abonnements.length === 0) {
      return NextResponse.json(
        {
          error: "Aucun appareil enregistré.",
        },
        { status: 404 }
      );
    }

    webpush.setVapidDetails(
      "mailto:notifications@feuillia.app",
      vapidPublicKey,
      vapidPrivateKey
    );

    const payload = JSON.stringify({
      title: "Feuillia 🌿",
      body: "Votre première notification Feuillia fonctionne !",
      url: "/aujourdhui",
    });

    let nombreEnvoyees = 0;

    for (const abonnement of abonnements) {
      try {
        await webpush.sendNotification(
          {
            endpoint: abonnement.endpoint,
            keys: {
              p256dh: abonnement.p256dh,
              auth: abonnement.auth,
            },
          },
          payload
        );

        nombreEnvoyees += 1;
      } catch (error) {
        console.error(
          "Erreur envoi notification vers appareil :",
          error
        );
      }
    }

    if (nombreEnvoyees === 0) {
      return NextResponse.json(
        {
          error:
            "La notification n'a pu être envoyée à aucun appareil.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      nombreAppareils: nombreEnvoyees,
    });
  } catch (error) {
    console.error(
      "Erreur notification Feuillia :",
      error
    );

    return NextResponse.json(
      {
        error:
          "Impossible d'envoyer la notification.",
      },
      { status: 500 }
    );
  }
}