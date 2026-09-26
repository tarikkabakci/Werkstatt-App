# Werkstatt Manager mit Firebase einrichten

## Voraussetzungen

- Google-/Firebase-Konto
- GitHub-Konto
- Ein Firebase-Projekt mit aktiviertem Abrechnungskonto für App Hosting

## 1. Quellcode bei GitHub speichern

1. Dieses ZIP entpacken.
2. Bei GitHub ein neues privates Repository `werkstatt-manager` erstellen.
3. Den vollständigen Inhalt des entpackten Ordners hochladen und committen.

## 2. Firebase-Projekt anlegen

1. `https://console.firebase.google.com` öffnen.
2. **Projekt hinzufügen** wählen und den Assistenten abschließen.
3. Im Projekt **Build → App Hosting** öffnen.
4. **Jetzt starten** wählen und das GitHub-Repository verbinden.
5. Als Stammverzeichnis `/` und als Live-Branch `main` auswählen.

## 3. Firestore und Storage aktivieren

1. **Build → Firestore Database → Datenbank erstellen** öffnen.
2. Eine europäische Region auswählen und die Datenbank erstellen.
3. Unter **Regeln** den Inhalt von `firestore.rules` einfügen und veröffentlichen.
4. **Build → Storage → Jetzt starten** öffnen.
5. Unter **Regeln** den Inhalt von `storage.rules` einfügen und veröffentlichen.

Die Regeln sperren direkte Browserzugriffe. Ausschließlich die geschützten
Serverrouten des Werkstatt-Managers greifen auf die Daten zu.

## 4. Anmeldung aktivieren

1. **Build → Authentication → Jetzt starten** öffnen.
2. Unter **Sign-in method** den Anbieter **E-Mail/Passwort** aktivieren.
3. Unter **Users → Add user** Ihre E-Mail-Adresse und Ihr Passwort anlegen.

## 5. Firebase-Web-API-Schlüssel hinterlegen

1. **Projekteinstellungen → Allgemein** öffnen.
2. Unter **Ihre Apps** eine Web-App registrieren, falls noch keine vorhanden ist.
3. Aus der angezeigten Firebase-Konfiguration den Wert `apiKey` kopieren.
4. Unter **App Hosting → Backend → Settings → Environment/Secrets** ein Secret
   mit dem Namen `FIREBASE_WEB_API_KEY` anlegen und den kopierten Wert speichern.
5. Einen neuen Rollout/Deploy starten.

## 6. Prüfen

1. Die App-Hosting-Adresse in einem privaten Browserfenster öffnen.
2. Die App muss zuerst die Anmeldung anzeigen.
3. Mit dem unter Authentication angelegten Benutzer anmelden.
4. Nach der Anmeldung startet die App mit dem Dashboard.

## Datenspeicherung

- Kunden, Fahrzeuge, Termine, Rechnungen, Lager und Einstellungen: Cloud Firestore
- Fahrzeugschein-Fotos: Cloud Storage for Firebase
- Benutzer und Passwörter: Firebase Authentication

Vorhandene Daten aus Netlify werden nicht automatisch übernommen.
