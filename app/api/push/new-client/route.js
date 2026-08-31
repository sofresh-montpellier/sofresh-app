import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";

function getSupabaseAdmin() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const supabaseSecretKey =
    process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !supabaseSecretKey) {
    throw new Error(
      "Configuration Supabase serveur manquante."
    );
  }

  return createClient(
    supabaseUrl,
    supabaseSecretKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

function verifyWebhook(request) {
  const receivedSecret =
    request.headers.get("x-sofresh-webhook-secret");

  const expectedSecret =
    process.env.SOFRESH_WEBHOOK_SECRET;

  if (!expectedSecret) {
    throw new Error(
      "SOFRESH_WEBHOOK_SECRET manquant."
    );
  }

  return receivedSecret === expectedSecret;
}

export async function POST(request) {
  try {
    if (!verifyWebhook(request)) {
      return Response.json(
        {
          error: "Webhook non autorisé.",
        },
        {
          status: 401,
        }
      );
    }

    const body = await request.json();

    const record =
      body?.record ||
      body?.new ||
      null;

    if (!record?.id) {
      return Response.json(
        {
          error: "Événement client invalide.",
        },
        {
          status: 400,
        }
      );
    }

    const supabaseAdmin = getSupabaseAdmin();

    /*
     * On relit l'événement depuis Supabase.
     * Cela évite de faire confiance uniquement
     * aux données reçues dans le webhook.
     */
    const {
      data: event,
      error: eventError,
    } = await supabaseAdmin
      .from("new_client_notification_events")
      .select("*")
      .eq("id", record.id)
      .maybeSingle();

    if (eventError) {
      throw eventError;
    }

    if (!event) {
      return Response.json(
        {
          error: "Événement introuvable.",
        },
        {
          status: 404,
        }
      );
    }

    /*
     * Protection contre les doubles notifications.
     */
    if (event.processed_at) {
      return Response.json({
        success: true,
        alreadyProcessed: true,
      });
    }

    const publicKey =
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

    const privateKey =
      process.env.VAPID_PRIVATE_KEY;

    if (!publicKey || !privateKey) {
      throw new Error(
        "Configuration VAPID incomplète."
      );
    }

    webpush.setVapidDetails(
      "https://sofresh-app-five.vercel.app",
      publicKey,
      privateKey
    );

    const {
      data: subscriptions,
      error: subscriptionsError,
    } = await supabaseAdmin
      .from("admin_push_subscriptions")
      .select("*");

    if (subscriptionsError) {
      throw subscriptionsError;
    }

    const fullName = [
      event.first_name,
      event.last_name,
    ]
      .filter(Boolean)
      .join(" ")
      .trim();

    const clientLabel =
      fullName ||
      event.email ||
      "Un nouveau client";

    const payload = JSON.stringify({
      title: "🔔 Nouveau client So Fresh",
      body: `${clientLabel} vient de valider son compte.`,
      url: "/admin",
    });

    let sent = 0;
    let failed = 0;

    for (const subscription of subscriptions || []) {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh,
              auth: subscription.auth,
            },
          },
          payload
        );

        sent += 1;
      } catch (pushError) {
        failed += 1;

        console.error(
          "Erreur notification nouveau client :",
          pushError
        );

        /*
         * L'abonnement n'existe plus :
         * on le supprime automatiquement.
         */
        if (
          pushError?.statusCode === 404 ||
          pushError?.statusCode === 410
        ) {
          await supabaseAdmin
            .from("admin_push_subscriptions")
            .delete()
            .eq(
              "endpoint",
              subscription.endpoint
            );
        }
      }
    }

    /*
     * On considère l'événement traité uniquement
     * si au moins une notification a été acceptée.
     */
    if (sent > 0) {
      const {
        error: updateError,
      } = await supabaseAdmin
        .from("new_client_notification_events")
        .update({
          processed_at:
            new Date().toISOString(),
        })
        .eq("id", event.id)
        .is("processed_at", null);

      if (updateError) {
        throw updateError;
      }
    }

    return Response.json({
      success: true,
      sent,
      failed,
    });
  } catch (error) {
    console.error(
      "Erreur webhook nouveau client :",
      error
    );

    return Response.json(
      {
        error:
          "Impossible de traiter la notification nouveau client.",
      },
      {
        status: 500,
      }
    );
  }
}