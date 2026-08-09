"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function login(event) {
    event.preventDefault();

    setMessage("");
    setLoading(true);

    const { error } =
      await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

    setLoading(false);

    if (error) {
      console.error("Erreur de connexion :", error);
      setMessage(
        "Adresse e-mail ou mot de passe incorrect."
      );
      return;
    }

    router.push("/admin");
    router.refresh();
  }

  return (
    <main className="login-page">
      <form
        className="login-card"
        onSubmit={login}
        autoComplete="on"
      >
        <div className="brand">
          SO <span>FRESH</span>
        </div>

        <h1>Administration</h1>

        <p>
          Connectez-vous pour gérer les commandes et les
          produits.
        </p>

        <label htmlFor="admin-email">
          Adresse e-mail
        </label>

        <input
          id="admin-email"
          name="username"
          type="email"
          required
          value={email}
          onChange={(event) =>
            setEmail(event.target.value)
          }
          placeholder="votre@email.fr"
          autoComplete="username"
          inputMode="email"
        />

        <label htmlFor="admin-password">
          Mot de passe
        </label>

        <input
          id="admin-password"
          name="password"
          type="password"
          required
          value={password}
          onChange={(event) =>
            setPassword(event.target.value)
          }
          autoComplete="current-password"
        />

        <button
          className="primary"
          type="submit"
          disabled={loading}
        >
          {loading
            ? "Connexion…"
            : "Se connecter"}
        </button>

        {message && (
          <div className="message">
            {message}
          </div>
        )}
      </form>
    </main>
  );
}
