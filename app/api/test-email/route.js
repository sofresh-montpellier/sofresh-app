import { NextResponse } from "next/server";
import { sendMail } from "../../../lib/mailer";

export async function GET() {
  try {
    await sendMail({
      to: process.env.SMTP_USER,
      subject: "Test e-mail So Fresh",
      text: "Test SMTP So Fresh réussi.",
      html: "<p>Test SMTP So Fresh réussi ✅</p>",
    });

    return NextResponse.json({
      success: true,
      message: "E-mail de test envoyé",
    });
  } catch (error) {
    console.error("Erreur test e-mail :", error);

    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}