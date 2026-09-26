# Werkstatt Manager auf Netlify einrichten

## 1. ZIP entpacken und Projekt bereitstellen

Dieses Paket ist ein vollständiges Netlify-Projekt mit Next.js, Netlify Functions,
Netlify Blobs und `netlify.toml`. Laden Sie den entpackten Projektordner in ein
Git-Repository und importieren Sie dieses unter **Add new project → Import an
existing project** in Netlify.

Netlify erkennt automatisch:

- Build-Befehl: `npm run build:netlify`
- Veröffentlichungsordner: `.next`
- Functions-Ordner: `netlify/functions`
- Node.js: Version 22

## 2. Passwortgeschützten Zugang aktivieren

Der Werkstatt-Manager sperrt alle Seiten und API-Routen automatisch. Legen Sie
vor dem Deploy in Netlify das gewünschte Passwort als geheime Umgebungsvariable
an:

1. Öffnen Sie **Project configuration → Environment variables**.
2. Wählen Sie **Add a variable**.
3. Tragen Sie als Schlüssel `APP_PASSWORD` ein.
4. Tragen Sie als Wert Ihr eigenes, starkes Passwort ein und markieren Sie es als Secret.
5. Starten Sie anschließend unter **Deploys** einen neuen Deploy.

Ohne `APP_PASSWORD` bleibt die Anwendung gesperrt und zeigt auf der Anmeldung
einen entsprechenden Einrichtungshinweis. Das Passwort wird nicht in der ZIP
und nicht im Browser-Code gespeichert. Die Anmeldung setzt nur ein sicheres,
HTTP-only Session-Cookie.

## 3. Dauerhafte Daten

Kunden, Fahrzeuge, Termine, Rechnungen, Einstellungen und Lagerdaten werden in
Netlify Blobs gespeichert. Fahrzeugschein-Fotos liegen in einem getrennten
Blob-Speicher. Neue Deployments überschreiben diese Daten nicht.

Hinweis: Daten aus der bisherigen ChatGPT-Sites-/Cloudflare-Version sind aus
Datenschutzgründen nicht in diesem Paket enthalten und werden nicht automatisch
übernommen.
