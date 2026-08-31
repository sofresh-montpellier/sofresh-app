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

    for (const subscription of subscriptions) {
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
        console.error(
          "Erreur envoi notification :",
          pushError
        );

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
      sent,
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