import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const tarifs = {
  jardinier_mensuel: process.env.STRIPE_PRICE_JARDINIER_MONTHLY,
  jardinier_annuel: process.env.STRIPE_PRICE_JARDINIER_YEARLY,
  expert_mensuel: process.env.STRIPE_PRICE_EXPERT_MONTHLY,
  expert_annuel: process.env.STRIPE_PRICE_EXPERT_YEARLY,
} as const;

type Offre = keyof typeof tarifs;

export async function POST(request: Request) {
  try {
    const { offre } = (await request.json()) as {
      offre?: Offre;
    };

    if (!offre || !(offre in tarifs)) {
      return NextResponse.json(
        { error: "Offre Feuillia invalide." },
        { status: 400 }
      );
    }

    const priceId = tarifs[offre];

    if (!priceId) {
      return NextResponse.json(
        { error: "Tarif Stripe non configuré." },
        { status: 500 }
      );
    }

    const origin =
      request.headers.get("origin") ||
      "https://feuillia-app.vercel.app";

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",

      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],

      success_url: `${origin}/profil?paiement=succes`,
      cancel_url: `${origin}/profil?paiement=annule`,
    });

    if (!session.url) {
      throw new Error("URL Stripe Checkout introuvable.");
    }

    return NextResponse.json({
      url: session.url,
    });
  } catch (error) {
    console.error("Erreur Stripe :", error);

    return NextResponse.json(
      { error: "Impossible de créer la session Stripe." },
      { status: 500 }
    );
  }
}