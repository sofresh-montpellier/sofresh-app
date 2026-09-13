import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendMail({ to, subject, html, text }) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    throw new Error("SMTP non configuré");
  }

  return transporter.sendMail({
    from: `"So Fresh" <${process.env.SMTP_USER}>`,
    to,
    subject,
    html,
    text,
  });
}