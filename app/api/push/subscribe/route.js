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

    const subscription = await request.json();

    if (
      !subscription?.endpoint ||
      !subscription?.keys?.p256dh ||
      !subscription?.keys?.auth
    ) {
      return Response.json(
        {
          error: "Abonnement push invalide.",
        },
        {
          status: 400,
        }
      );
    }

    const { error } = await supabaseAdmin
      .from("admin_push_subscriptions")
      .upsert(
        {
          endpoint: subscription.endpoint,
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
        },
        {
          onConflict: "endpoint",
        }
      );

    if (error) {
      console.error(
        "Erreur enregistrement abonnement push :",
        error
      );

      return Response.json(
        {
          error:
            "Impossible d'enregistrer les notifications.",
        },
        {
          status: 500,
        }
      );
    }

    return Response.json({
      success: true,
    });
  } catch (error) {
    console.error(
      "Erreur route push subscribe :",
      error
    );

    return Response.json(
      {
        error:
          "Une erreur est survenue pendant l'activation des notifications.",
      },
      {
        status: 500,
      }
    );
  }
}