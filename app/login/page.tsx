"use client";

import { useState, type FormEvent } from "react";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("Bitte mit dem Werkstatt-Passwort anmelden.");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Anmeldung fehlgeschlagen");
      window.location.replace("/");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Anmeldung nicht möglich.");
      setBusy(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <span className="login-logo" aria-hidden="true" />
        <p className="login-kicker">AAAmann Performance</p>
        <h1>Werkstatt Manager</h1>
        <p>{message}</p>
        <form onSubmit={submit}>
          <label>
            Passwort
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              minLength={8}
              required
            />
          </label>
          <button type="submit" disabled={busy}>
            {busy ? "Bitte warten …" : "Anmelden"}
          </button>
        </form>
        <small>Zugriff nur mit dem in Netlify hinterlegten Passwort.</small>
      </section>
    </main>
  );
}
