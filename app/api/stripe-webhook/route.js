import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

function getSupabaseAdmin() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SECRET_KEY) {
    throw new Error("Configuration Supabase serveur manquante.");
  }

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SECRET_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

export async function POST(request) {
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Webhook Stripe non configuré." }, { status: 500 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Signature Stripe manquante." }, { status: 400 });
  }

  let event;
  try {
    const body = await request.text();
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (error) {
    console.error("Signature webhook Stripe invalide :", error);
    return NextResponse.json({ error: "Signature webhook invalide." }, { status: 400 });
  }

  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ received: true });
  }

  const session = event.data.object;

  if (session.payment_status !== "paid") {
    return NextResponse.json({ received: true });
  }

  const pendingCheckoutId = session.metadata?.pending_checkout_id;
  if (!pendingCheckoutId) {
    console.error("pending_checkout_id absent :", session.id);
    return NextResponse.json(
      { error: "Référence de commande provisoire manquante." },
      { status: 400 }
    );
  }

  const supabase = getSupabaseAdmin();

  try {
    // Stripe peut renvoyer un webhook : ne jamais recréer la même commande.
    const { data: existing, error: existingError } = await supabase
      .from("orders")
      .select("id, order_number")
      .eq("stripe_session_id", session.id)
      .maybeSingle();

    if (existingError) throw existingError;
    if (existing) {
      return NextResponse.json({ received: true, duplicate: true });
    }

    const { data: pending, error: pendingError } = await supabase
      .from("pending_checkouts")
      .select("*")
      .eq("id", pendingCheckoutId)
      .maybeSingle();

    if (pendingError) throw pendingError;
    if (!pending) {
      return NextResponse.json(
        { error: "Commande provisoire introuvable." },
        { status: 404 }
      );
    }

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        customer_name: pending.customer_name,
        customer_phone: pending.customer_phone,
        pickup_time: pending.pickup_time,
        pickup_date: pending.pickup_date,
        items: pending.items,
        total: pending.total,
        status: "Nouvelle",
        stripe_session_id: session.id,
        payment_status: "paid",
        user_id: pending.user_id ?? null,
      })
      .select("id, order_number")
      .single();

    if (orderError) throw orderError;

    const { error: updateError } = await supabase
      .from("pending_checkouts")
      .update({ status: "completed" })
      .eq("id", pendingCheckoutId);

    if (updateError) {
      console.error("Commande créée mais pending non actualisé :", updateError);
    }

    // Fidélité So Fresh : 1 formule payée = 1 point.
    // La 10e formule bénéficie de -50 %, puis le compteur repart à 0.
    // Les valeurs utilisées ont été figées dans pending_checkouts avant Stripe.
    //
    // La protection anti-doublon placée plus haut sur stripe_session_id garantit
    // qu'un retry Stripe ne crédite pas une deuxième fois la fidélité.
    if (pending.user_id) {
      const startProgress = Math.max(
        0,
        Math.min(9, Number(pending.loyalty_start_progress ?? 0))
      );

      const formulaCount = Math.max(
        0,
        Number(pending.loyalty_formula_count ?? 0)
      );

      let finalProgress = startProgress;

      for (let i = 0; i < formulaCount; i += 1) {
        finalProgress = finalProgress === 9 ? 0 : finalProgress + 1;
      }

      if (formulaCount > 0) {
        const { error: loyaltyError } = await supabase
          .from("loyalty_accounts")
          .upsert(
            {
              user_id: pending.user_id,
              progress: finalProgress,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "user_id" }
          );

        if (loyaltyError) {
          // Le paiement et la commande sont déjà validés.
          // On journalise donc l'erreur sans provoquer un retry Stripe
          // qui pourrait perturber la finalisation déjà réussie.
          console.error(
            "Commande créée mais fidélité non actualisée :",
            loyaltyError
          );
        }
      }
    }

    return NextResponse.json({
      received: true,
      order_id: order.id,
      order_number: order.order_number,
    });
  } catch (error) {
    console.error("Erreur finalisation commande Stripe :", error);
    return NextResponse.json(
      { error: "Impossible de finaliser la commande." },
      { status: 500 }
    );
  }
}
