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

async function verifyAdmin(request, supabaseAdmin) {
  const authorization =
    request.headers.get("authorization") || "";

  if (!authorization.startsWith("Bearer ")) {
    return null;
  }

  const token = authorization.slice(7);

  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser(token);

  if (error || !user) {
    return null;
  }

  if (user.app_metadata?.role !== "admin") {
    return null;
  }

  return user;
}

function getPushService(endpoint = "") {
  if (endpoint.includes("web.push.apple.com")) {
    return "Apple Push";
  }

  if (
    endpoint.includes("fcm.googleapis.com") ||
    endpoint.includes("googleapis.com")
  ) {
    return "Google Push";
  }

  if (endpoint.includes("mozilla.com")) {
    return "Mozilla Push";
  }

  return "Service Push inconnu";
}

function shortEndpoint(endpoint = "") {
  try {
    const url = new URL(endpoint);

    return `${url.hostname}${url.pathname.slice(0, 35)}...`;
  } catch {
    return endpoint.slice(0, 55);
  }
}

export async function POST(request) {
  try {
    const supabaseAdmin = getSupabaseAdmin();

    const admin = await verifyAdmin(
      request,
      supabaseAdmin
    );

    if (!admin) {
      return Response.json(
        {
          error: "Accès administrateur refusé.",
        },
        {
          status: 401,
        }
      );
    }

    const publicKey =
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

    const privateKey =
      process.env.VAPID_PRIVATE_KEY;

    if (!publicKey || !privateKey) {
      return Response.json(
        {
          error:
            "Configuration des notifications incomplète.",
        },
        {
          status: 500,
        }
      );
    }

    webpush.setVapidDetails(
      "https://sofresh-app-five.vercel.app",
      publicKey,
      privateKey
    );

    const { data: subscriptions, error } =
      await supabaseAdmin
        .from("admin_push_subscriptions")
        .select("*");

    if (error) {
      throw error;
    }

    if (!subscriptions?.length) {
      return Response.json(
        {
          error:
            "Aucun appareil n'est inscrit aux notifications.",
        },
        {
          status: 404,
        }
      );
    }

    const payload = JSON.stringify({
      title: "🔔 So Fresh",
      body:
        "Test réussi : les notifications fonctionnent !",
      url: "/admin",
    });

    let sent = 0;
    let failed = 0;

    const results = [];

    for (const subscription of subscriptions) {
      const service = getPushService(
        subscription.endpoint
      );

      try {
        const response =
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

        results.push({
          id: subscription.id,
          service,
          endpoint: shortEndpoint(
            subscription.endpoint
          ),
          success: true,
          statusCode:
            response?.statusCode || null,
          body:
            response?.body || null,
        });
      } catch (pushError) {
        failed += 1;

        console.error(
          "Erreur envoi notification :",
          {
            service,
            statusCode:
              pushError?.statusCode || null,
            body:
              pushError?.body || null,
            message:
              pushError?.message || null,
          }
        );

        results.push({
          id: subscription.id,
          service,
          endpoint: shortEndpoint(
            subscription.endpoint
          ),
          success: false,
          statusCode:
            pushError?.statusCode || null,
          body:
            pushError?.body || null,
          message:
            pushError?.message ||
            "Erreur inconnue",
        });

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

    return Response.json({
      success: true,
      subscriptions:
        subscriptions.length,
      sent,
      failed,
      results,
    });
  } catch (error) {
    console.error(
      "Erreur test notification :",
      error
    );

    return Response.json(
      {
        error:
          "Impossible d'envoyer la notification test.",
      },
      {
        status: 500,
      }
    );
  }
}