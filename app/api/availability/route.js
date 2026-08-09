import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL;

    const supabaseSecretKey =
      process.env.SUPABASE_SECRET_KEY;

    if (!supabaseUrl || !supabaseSecretKey) {
      throw new Error(
        "Configuration Supabase incomplète."
      );
    }

    const supabase = createClient(
      supabaseUrl,
      supabaseSecretKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    const pickupDate =
      request.nextUrl.searchParams.get("date");

    if (
      !pickupDate ||
      !/^\d{4}-\d{2}-\d{2}$/.test(pickupDate)
    ) {
      return NextResponse.json(
        {
          error: "Date de retrait invalide.",
        },
        {
          status: 400,
        }
      );
    }

    const { data: settings, error: settingsError } =
      await supabase
        .from("settings")
        .select("slot_capacity")
        .eq("id", 1)
        .single();

    if (settingsError || !settings) {
      console.error(
        "Erreur paramètres :",
        settingsError
      );

      return NextResponse.json(
        {
          error:
            "Impossible de charger la capacité des créneaux.",
        },
        {
          status: 500,
        }
      );
    }

    const slotCapacity = Number(
      settings.slot_capacity
    );

    const { data: orders, error: ordersError } =
      await supabase
        .from("orders")
        .select("pickup_time,status")
        .eq("pickup_date", pickupDate)
        .neq("status", "Annulée");

    if (ordersError) {
      console.error(
        "Erreur chargement commandes :",
        ordersError
      );

      return NextResponse.json(
        {
          error:
            "Impossible de vérifier les créneaux.",
        },
        {
          status: 500,
        }
      );
    }

    const thirtyMinutesAgo = new Date(
      Date.now() - 30 * 60 * 1000
    ).toISOString();

    const {
      data: pendingCheckouts,
      error: pendingError,
    } = await supabase
      .from("pending_checkouts")
      .select("pickup_time")
      .eq("pickup_date", pickupDate)
      .eq("status", "pending")
      .gte("created_at", thirtyMinutesAgo);

    if (pendingError) {
      console.error(
        "Erreur paiements en attente :",
        pendingError
      );

      return NextResponse.json(
        {
          error:
            "Impossible de vérifier les créneaux.",
        },
        {
          status: 500,
        }
      );
    }

    const counts = {};

    for (const order of orders || []) {
      const time = order.pickup_time;

      counts[time] =
        (counts[time] || 0) + 1;
    }

    for (const pending of pendingCheckouts || []) {
      const time = pending.pickup_time;

      counts[time] =
        (counts[time] || 0) + 1;
    }

    return NextResponse.json(
      {
        capacity: slotCapacity,
        counts,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error(
      "Erreur disponibilité :",
      error
    );

    return NextResponse.json(
      {
        error:
          "La disponibilité des créneaux ne peut pas être chargée.",
      },
      {
        status: 500,
      }
    );
  }
}
